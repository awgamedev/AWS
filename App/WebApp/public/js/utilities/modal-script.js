/**
 * Initialize the modal component in the DOM
 * Call this once when the page loads
 */
const initModal = (__translator) => {
  if (document.getElementById("app-modal")) return; // Already initialized

  const modalHtml = `
    <div 
      x-data="{ 
        show: false, 
        title: '', 
        contentHtml: '', 
        openModal(event) {
          setTimeout(() => {
            this.show = true; 
            this.title = event.detail.title;
            this.contentHtml = event.detail.content;
            document.body.classList.add('overflow-hidden');
          }, 10);
        },
        closeModal() {
          this.show = false;
          document.body.classList.remove('overflow-hidden');
        }
      }" 
      
      @open-modal.window="openModal($event)"
      @close-modal.window="closeModal()"
      x-show="show" 
      class="fixed inset-0 z-50 flex items-center justify-center transition-opacity"
      x-transition:enter="ease-out duration-300" 
      x-transition:enter-start="opacity-0" 
      x-transition:enter-end="opacity-100" 
      x-transition:leave="ease-in duration-200" 
      x-transition:leave-start="opacity-100" 
      x-transition:leave-end="opacity-0"
      @click.away="closeModal()"
      @keydown.escape.window="closeModal()"
      x-cloak
      id="app-modal"
    >
      <div class="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true"></div>
      <div 
        class="mx-2 bg-white rounded-lg shadow-xl transform transition-all sm:w-full sm:max-w-lg"
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="modal-title"
        x-transition:enter="ease-out duration-300" 
        x-transition:enter-start="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" 
        x-transition:enter-end="opacity-100 translate-y-0 sm:scale-100" 
        x-transition:leave="ease-in duration-200" 
        x-transition:leave-start="opacity-100 translate-y-0 sm:scale-100" 
        x-transition:leave-end="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
      >
        <div class="px-4 py-3 sm:px-6 flex justify-between items-center border-b">
          <h3 class="text-lg font-medium text-gray-900" id="modal-title" x-text="title"></h3>
          <button @click="closeModal()" type="button" class="text-gray-400 hover:text-gray-500">
            <span class="sr-only">Close</span>
            <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-6">
          <div x-html="contentHtml"></div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
};

/**
 * Open modal with static content
 */
const openModal = (title, content) => {
  window.dispatchEvent(
    new CustomEvent("open-modal", { detail: { title, content } })
  );
};

/**
 * Open modal by fetching content from an API endpoint
 * @param {string} title - Modal title
 * @param {string} apiUrl - API endpoint to fetch modal content
 * @param {Function} onContentLoaded - Optional callback after content is loaded
 */
const openModalFromApi = async (title, apiUrl, onContentLoaded) => {
  try {
    // Show loading state
    openModal(title, '<div class="text-center py-4">Loading...</div>');

    const { ok, data } = await api(apiUrl);

    if (ok && data.html) {
      openModal(title, data.html);

      // Wait a bit for DOM to update, then call callback
      if (onContentLoaded) {
        setTimeout(onContentLoaded, 100);
      }
    } else {
      openModal(
        title,
        '<div class="text-center py-4 text-red-600">Failed to load content</div>'
      );
    }
  } catch (error) {
    console.error("Error loading modal content:", error);
    openModal(
      title,
      '<div class="text-center py-4 text-red-600">Error loading content</div>'
    );
  }
};

/**
 * Close the modal
 */
const closeModal = () => {
  window.dispatchEvent(new CustomEvent("close-modal"));
};
