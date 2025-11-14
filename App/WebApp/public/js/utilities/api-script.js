const api = async (url, options) => {
  const res = await fetch(url, options);
  const data = await parseJsonSafe(res);
  return { ok: res.ok, status: res.status, data };
};
