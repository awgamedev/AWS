const reloadAfter = (ms = 1000) => {
  setTimeout(() => {
    closeModal();
    window.location.reload();
  }, ms);
};
