class Modal {
  static nextId = 0;

  /**
   * @param {string} title The title for the modal header.
   * @param {string} contentHtml The HTML content for the modal body.
   */
  constructor(title, contentHtml) {
    this.id = Modal.nextId++;
    this.title = title;
    this.contentHtml = contentHtml;
    this.element = null;
    this.init();
  }

  // Template for the modal's HTML
  get template() {
    return `
            <dialog id="dynamic-modal-${this.id}" class="p-0 rounded-lg shadow-2xl backdrop:bg-black/50">
                <div class="p-6 bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg mx-auto">
                    <div class="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
                        <h3 class="text-xl font-semibold text-gray-900 dark:text-white">${this.title}</h3>
                        <button type="button" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white" data-modal-close>
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                        </button>
                    </div>
                    
                    <div class="py-4 text-gray-600 dark:text-gray-400">
                        ${this.contentHtml}
                    </div>

                    <div class="flex items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                        <button data-modal-close type="button" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Close</button>
                    </div>
                </div>
            </dialog>
        `;
  }

  // Initializes the modal element and appends it to the document body
  init() {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = this.template.trim();
    this.element = wrapper.firstChild;

    // **Append the modal to the HTML (document.body)**
    document.body.appendChild(this.element);

    // Attach close event listeners
    this.element.querySelectorAll("[data-modal-close]").forEach((button) => {
      button.addEventListener("click", () => this.close());
    });

    // Optional: Close on backdrop click (if using <dialog>)
    this.element.addEventListener("click", (e) => {
      const rect = this.element.getBoundingClientRect();
      // Check if the click occurred outside the dialog content box
      if (
        e.clientY < rect.top ||
        e.clientY > rect.bottom ||
        e.clientX < rect.left ||
        e.clientX > rect.right
      ) {
        this.close();
      }
    });
  }

  // Method to show the modal
  open() {
    if (this.element && "showModal" in this.element) {
      this.element.showModal();
    } else {
      console.error(
        "The <dialog> element or its showModal method is not supported."
      );
    }
  }

  // Method to close the modal
  close() {
    if (this.element && "close" in this.element) {
      this.element.close();
      // Optional: Remove element from DOM after closing for true reusability/cleanup
      this.element.remove();
    }
  }
}
