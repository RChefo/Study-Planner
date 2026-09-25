require('dotenv').config();

const crypto = require('node:crypto');
const path = require('node:path');
const { Readable } = require('node:stream');
const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const { MongoClient, GridFSBucket, ObjectId } = require('mongodb');

const app = express();
const port = Number(process.env.PORT || 3000);
const maxUploadMb = Number(process.env.MAX_UPLOAD_MB || 40);
const sessionDays = 14;
const cookieName = 'rafiq_session';
const oauthStateCookie = 'rafiq_oauth_state';
const oauthStatePath = '/api/auth/discord';
const isProduction = () => process.env.NODE_ENV === 'production';
const isSet = key => !!process.env[key] && !process.env[key].startsWith('replace-with-');
const discordConfigured = () => isSet('DISCORD_CLIENT_ID') && isSet('DISCORD_CLIENT_SECRET') && isSet('DISCORD_REDIRECT_URI');
let db;
let filesBucket;
let googleClient;

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use(express.json({ limit: `${Math.ceil(maxUploadMb * 1.4 + 5)}mb` }));
// React app built by Vite (npm run build).
const clientDir = path.join(__dirname, 'dist');
app.use(express.static(clientDir, { index: false }));

function base64url(value) { return Buffer.from(value).toString('base64url'); }
function sessionToken(payload) {
  const body = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function readCookies(header = '') {
  return Object.fromEntries(header.split(';').map(s => s.trim()).filter(Boolean).map(s => {
    const i = s.indexOf('='); return [s.slice(0, i), decodeURIComponent(s.slice(i + 1))];
  }));
}
function userFromRequest(req) {
  const token = readCookies(req.headers.cookie)[cookieName];
  if (!token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(body).digest();
  let actual;
  try { actual = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.sub || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}
function sessionCookieOptions(extra = {}) {
  return { httpOnly: true, secure: isProduction(), sameSite: 'lax', path: '/', ...extra };
}
/** Stores the profile and sets the signed session cookie (shared by every sign-in provider). */
async function issueSession(res, user) {
  await db.collection('users').updateOne({ _id: user.sub }, { $set: { ...user, lastSignInAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
  const now = Math.floor(Date.now() / 1000);
  const token = sessionToken({ ...user, iat: now, exp: now + sessionDays * 86400 });
  res.cookie(cookieName, token, sessionCookieOptions({ maxAge: sessionDays * 86400 * 1000 }));
}
/** Only same-site relative paths may be used as post-login destinations (no open redirects). */
function safeNextPath(value) {
  if (typeof value !== 'string' || value.length > 512) return '/app';
  const hasControlChar = [...value].some(ch => ch.charCodeAt(0) < 0x20);
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || hasControlChar) return '/app';
  return value;
}
function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function requireUser(req, res, next) {
  req.user = userFromRequest(req);
  if (!req.user) return res.status(401).json({ error: 'sign_in_required' });
  next();
}

app.get('/api/config', (req, res) => res.json({ googleClientId: isSet('GOOGLE_CLIENT_ID') ? process.env.GOOGLE_CLIENT_ID : '', discordEnabled: discordConfigured() }));
app.post('/api/auth/google', async (req, res, next) => {
  try {
    if (!googleClient || !process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ error: 'google_sign_in_not_configured' });
    const credential = req.body?.credential;
    if (typeof credential !== 'string') return res.status(400).json({ error: 'missing_credential' });
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const profile = ticket.getPayload();
    if (!profile?.sub || !profile.email_verified) return res.status(401).json({ error: 'google_account_not_verified' });
    // Google account ids are kept as-is so existing users keep their planner data.
    const user = { sub: profile.sub, email: profile.email || '', name: profile.name || profile.email || '', picture: profile.picture || '', provider: 'google' };
    await issueSession(res, user);
    res.json({ user });
  } catch (err) { next(err); }
});

// Discord: standard OAuth 2.0 authorization-code flow. The client secret never leaves the server.
app.get('/api/auth/discord/start', (req, res) => {
  if (!discordConfigured()) return res.redirect(302, '/auth/callback?provider=discord&error=discord_not_configured');
  const state = crypto.randomBytes(24).toString('base64url');
  const next = safeNextPath(req.query.next);
  res.cookie(oauthStateCookie, `${state}.${Buffer.from(next).toString('base64url')}`, sessionCookieOptions({ path: oauthStatePath, maxAge: 10 * 60 * 1000 }));
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
    scope: 'identify email',
    state,
  });
  res.redirect(302, `https://discord.com/oauth2/authorize?${params}`);
});
app.get('/api/auth/discord/callback', async (req, res) => {
  const fail = reason => res.redirect(302, `/auth/callback?provider=discord&error=${reason}`);
  const stored = readCookies(req.headers.cookie)[oauthStateCookie] || '';
  res.clearCookie(oauthStateCookie, sessionCookieOptions({ path: oauthStatePath }));
  if (!discordConfigured()) return fail('discord_not_configured');
  const [expectedState, encodedNext = ''] = stored.split('.');
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  if (!expectedState || !state || !safeEqual(expectedState, state)) return fail('state_mismatch');
  if (req.query.error) return fail(req.query.error === 'access_denied' ? 'cancelled' : 'provider_error');
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  if (!code) return fail('provider_error');
  const next = safeNextPath(Buffer.from(encodedNext, 'base64url').toString('utf8'));
  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${process.env.DISCORD_CLIENT_ID}:${process.env.DISCORD_CLIENT_SECRET}`).toString('base64'),
      },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: process.env.DISCORD_REDIRECT_URI }),
      signal: AbortSignal.timeout(10000),
    });
    if (!tokenResponse.ok) {
      console.error('Discord token exchange failed with status', tokenResponse.status);
      return fail('provider_error');
    }
    const { access_token: accessToken } = await tokenResponse.json();
    const profileResponse = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10000) });
    if (!profileResponse.ok) {
      console.error('Discord profile request failed with status', profileResponse.status);
      return fail('provider_error');
    }
    const profile = await profileResponse.json();
    if (!profile?.id) return fail('provider_error');
    // Namespaced id so a Discord account can never collide with a Google account id.
    const user = {
      sub: `discord:${profile.id}`,
      email: profile.verified && profile.email ? profile.email : '',
      name: profile.global_name || profile.username || 'Discord',
      picture: profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=128` : '',
      provider: 'discord',
    };
    await issueSession(res, user);
    res.redirect(302, `/auth/callback?provider=discord&next=${encodeURIComponent(next)}`);
  } catch (err) {
    console.error('Discord sign-in failed:', err.message);
    fail(err.name === 'TimeoutError' ? 'provider_unavailable' : 'server_error');
  }
});

app.get('/api/auth/me', requireUser, (req, res) => res.json({ user: { sub: req.user.sub, email: req.user.email, name: req.user.name, picture: req.user.picture, provider: req.user.provider || 'google' } }));
app.post('/api/auth/logout', (req, res) => { res.clearCookie(cookieName, sessionCookieOptions()); res.status(204).end(); });

app.get('/api/data', requireUser, async (req, res, next) => {
  try {
    const record = await db.collection('plannerData').findOne({ _id: req.user.sub });
    res.json({ data: record?.data || null, updatedAt: record?.updatedAt || null });
  } catch (err) { next(err); }
});
app.put('/api/data', requireUser, async (req, res, next) => {
  try {
    const data = req.body?.data;
    if (!data || typeof data !== 'object' || !Array.isArray(data.courses) || !Array.isArray(data.commitments)) return res.status(400).json({ error: 'invalid_data' });
    if (Buffer.byteLength(JSON.stringify(data), 'utf8') > 12 * 1024 * 1024) return res.status(413).json({ error: 'planner_data_too_large' });
    const updatedAt = new Date();
    await db.collection('plannerData').replaceOne({ _id: req.user.sub }, { _id: req.user.sub, data, updatedAt }, { upsert: true });
    res.json({ updatedAt });
  } catch (err) { next(err); }
});

app.post('/api/files', requireUser, async (req, res, next) => {
  try {
    const { data, name = 'attachment.pdf' } = req.body || {};
    const match = typeof data === 'string' && data.match(/^data:(application\/pdf|image\/(?:png|jpeg|webp));base64,([\s\S]+)$/i);
    if (!match) return res.status(400).json({ error: 'unsupported_file_type' });
    const bytes = Buffer.from(match[2], 'base64');
    if (!bytes.length || bytes.length > maxUploadMb * 1024 * 1024) return res.status(413).json({ error: 'file_too_large', maxUploadMb });
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    const existing = await db.collection('studyFiles.files').findOne({ 'metadata.userId': req.user.sub, 'metadata.sha256': sha256 }, { projection: { _id: 1 } });
    if (existing) return res.json({ id: existing._id.toString(), sha256 });
    const stream = filesBucket.openUploadStream(String(name).slice(0, 180), { metadata: { userId: req.user.sub, sha256, mimeType: match[1] } });
    await new Promise((resolve, reject) => { stream.once('finish', resolve); stream.once('error', reject); Readable.from(bytes).pipe(stream); });
    res.json({ id: stream.id.toString(), sha256 });
  } catch (err) { next(err); }
});
app.get('/api/files/:id', requireUser, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).end();
    const id = new ObjectId(req.params.id);
    const meta = await db.collection('studyFiles.files').findOne({ _id: id, 'metadata.userId': req.user.sub });
    if (!meta) return res.status(404).end();
    res.setHeader('Content-Type', meta.metadata?.mimeType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    filesBucket.openDownloadStream(id).on('error', next).pipe(res);
  } catch (err) { next(err); }
});

app.get('*', (req, res) => res.sendFile(path.join(clientDir, 'index.html')));
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: 'server_error', message: process.env.NODE_ENV === 'production' ? 'حدث خطأ بالخادم.' : err.message });
});

async function main() {
  const missing = ['MONGODB_URI', 'SESSION_SECRET'].filter(key => !isSet(key));
  if (!isSet('GOOGLE_CLIENT_ID') && !discordConfigured()) missing.push('GOOGLE_CLIENT_ID (or DISCORD_CLIENT_ID + DISCORD_CLIENT_SECRET + DISCORD_REDIRECT_URI)');
  if (missing.length) throw new Error(`Missing required environment settings: ${missing.join(', ')}`);
  if (process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters.');
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db(process.env.MONGODB_DATABASE || 'rafiq_study');
  filesBucket = new GridFSBucket(db, { bucketName: 'studyFiles' });
  if (isSet('GOOGLE_CLIENT_ID')) googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  app.listen(port, () => console.log(`Rafiq Study is running on port ${port}`));
}

main().catch(err => { console.error(err.message); process.exit(1); });
