const parseJsonSafe = async (res) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};
