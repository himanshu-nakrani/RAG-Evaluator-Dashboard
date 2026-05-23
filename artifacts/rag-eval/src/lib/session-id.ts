const SESSION_STORAGE_KEY = "rag-eval.sessionId";

let _sessionId: string | null = null;

export function getSessionId(): string {
  if (_sessionId) return _sessionId;
  _sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!_sessionId) {
    _sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_STORAGE_KEY, _sessionId);
  }
  return _sessionId;
}
