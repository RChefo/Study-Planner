/** Desktop notification, only if the user already granted permission (as before). */
export function notifyStudy(message: string): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('رفيق الدراسة', { body: message });
  }
}
