const openModal = (title, content) => {
  window.dispatchEvent(
    new CustomEvent("open-modal", { detail: { title, content } })
  );
};

const closeModal = () => {
  window.dispatchEvent(new CustomEvent("close-modal"));
};
