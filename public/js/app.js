const views = {
  home: document.querySelector("#homeView"),
  events: document.querySelector("#eventsView"),
  shop: document.querySelector("#shopView"),
  product: document.querySelector("#productView")
};

let events = [];

async function loadEvents() {
const eventGrid = document.querySelector("#eventGrid");

if (!eventGrid) {
return;
}

try {
const response = await fetch("../data/events.json");

if (!response.ok) {
  throw new Error(`Unable to load events: ${response.status}`);
}

events = await response.json();

events.sort((a, b) => {
  return new Date(a.date) - new Date(b.date);
});

renderEvents(events);

} catch (error) {
console.error("Event loading error:", error);

eventGrid.innerHTML = `
  <p class="events-error">
    Events could not be loaded right now. Please check back soon.
  </p>
`;

}
}

async function loadProducts() {
const productGrid = document.querySelector("#productGrid");

if (!productGrid) {
return;
}

try {
const response = await fetch("../data/products.json");

if (!response.ok) {
  throw new Error(`Unable to load products: ${response.status}`);
}

products = await response.json();

products = products.filter(product => product.available !== false);

renderProducts();

} catch (error) {
console.error("Product loading error:", error);

productGrid.innerHTML = `
  <p class="products-error">
    Products could not be loaded right now. Please check back soon.
  </p>
`;

}
}

function renderEvents(eventList) {
const eventGrid = document.querySelector("#eventGrid");

if (!eventGrid) {
return;
}

if (!eventList.length) {
eventGrid.innerHTML = `<p class="events-empty"> There are no upcoming events currently scheduled. </p> `;
return;
}

eventGrid.innerHTML = eventList
.map(event => createEventCard(event))
.join("");
}

function createEventCard(event) {
const registrationText = event.registrationOpen
? "Register now →"
: "Register interest →";

return `
<article class="event-card ${event.theme}-event">
<img src="${event.image}" alt="${event.imageAlt}" >

  <div class="event-card-body">
    <p class="eyebrow">${event.displayDate}</p>

    <h3>
      ${event.title}
      <span aria-hidden="true">${event.emoji}</span>
    </h3>

    <p class="event-meta">
      ${event.type} • Community • Fundraising
    </p>

    <p>${event.description}</p>

    <p>
      <strong>Location:</strong>
      ${event.location}
    </p>

    <p>
      <strong>Time:</strong>
      ${event.time}
    </p>

    <p>${event.dressMessage}</p>

    <button
      class="text-button event-register"
      type="button"
      data-event="${event.title}"
      data-event-id="${event.id}"
    >
      ${registrationText}
    </button>
  </div>
</article>

`;
}

let products = [];

let currentProduct = null;
let selectedSize = "";
let toastTimer = null;

function showView(name) {
  Object.values(views).forEach(view => view.classList.add("hidden"));
  const target = views[name] || views.home;
  target.classList.remove("hidden");

  document.querySelectorAll("[data-view-link]").forEach(link => {
    const active = link.dataset.viewLink === name;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  document.querySelector("#mainNav").classList.remove("open");
  document.querySelector("#menuButton").setAttribute("aria-expanded", "false");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function showMessage(title, text) {
  const dialog = document.querySelector("#messageDialog");
  document.querySelector("#messageTitle").textContent = title;
  document.querySelector("#messageText").textContent = text;
  dialog.showModal();
}

function getFilteredProducts() {
  const category = document.querySelector("#categoryFilter").value;
  const sort = document.querySelector("#sortProducts").value;

  let list = products.filter(product => category === "All" || product.category === category);

  if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
  if (sort === "featured") list.sort((a, b) => a.featured - b.featured);

  return list;
}

function renderProducts() {
  const list = getFilteredProducts();
  const grid = document.querySelector("#productGrid");
  document.querySelector("#productCount").textContent =
    `${list.length} product${list.length === 1 ? "" : "s"}`;

  grid.innerHTML = list.map(product => `
    <article class="product-card">
      <img src="${product.image}" alt="${product.imageAlt || product.name}">
      <div class="product-card-body">
        <p class="eyebrow">${product.category}</p>
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <div class="product-card-footer">
          <strong>$${product.price.toFixed(2)}</strong>
          <button class="text-button view-product" type="button" data-product-id="${product.id}">
            View item →
          </button>
        </div>
      </div>
    </article>
  `).join("");
}

function openProduct(productId) {
  const product = products.find(item => item.id === Number(productId));
  if (!product) return;

  currentProduct = product;
  selectedSize = product.sizes.length === 1 ? product.sizes[0] : "";

  document.querySelector("#productImage").src = product.image;
  document.querySelector("#productImage").alt = product.imageAlt || product.name;
  document.querySelector("#productCategory").textContent = product.category;
  document.querySelector("#productTitle").textContent = product.name;
  document.querySelector("#productPrice").textContent = `$${product.price.toFixed(2)}`;
  document.querySelector("#productDescription").textContent = product.description;
  document.querySelector("#breadcrumbProduct").textContent = product.name;
  document.querySelector("#productQuantity").value = 1;

  const sizeGroup = document.querySelector("#sizeGroup");
  const sizeRow = document.querySelector("#productSizes");

  if (product.sizes.length) {
    sizeGroup.classList.remove("hidden");
    sizeRow.innerHTML = product.sizes.map(size => `
      <button type="button" class="size-option${selectedSize === size ? " selected" : ""}"
              data-size="${size}">${size}</button>
    `).join("");
  } else {
    sizeGroup.classList.add("hidden");
    sizeRow.innerHTML = "";
  }

  showView("product");
}

document.addEventListener("DOMContentLoaded", () => {
  loadEvents();
  loadProducts();
  document.querySelector("#year").textContent = new Date().getFullYear();

  document.querySelectorAll("[data-view-link], [data-show-view]").forEach(control => {
    control.addEventListener("click", event => {
      event.preventDefault();
      showView(control.dataset.viewLink || control.dataset.showView);
    });
  });

  document.querySelector("#brandHome").addEventListener("click", event => {
    event.preventDefault();
    showView("home");
  });

  document.querySelector("#menuButton").addEventListener("click", () => {
    const nav = document.querySelector("#mainNav");
    const open = nav.classList.toggle("open");
    document.querySelector("#menuButton").setAttribute("aria-expanded", String(open));
  });

  document.querySelector("#aboutLink").addEventListener("click", () => {
    document.querySelector("#aboutDialog").showModal();
  });

  document.querySelectorAll(".dialog-close").forEach(button => {
    button.addEventListener("click", () => button.closest("dialog").close());
  });

  document.querySelector("#messageOkay").addEventListener("click", () => {
    document.querySelector("#messageDialog").close();
  });

  document.querySelectorAll("dialog").forEach(dialog => {
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
  });

  document.querySelectorAll("[data-donate]").forEach(button => {
    button.addEventListener("click", () => {
      showMessage(
        "Thank you for supporting the mission",
        "Connect this button to the charity's verified donation provider once Roger has chosen one."
      );
    });
  });

  document.querySelector("#volunteerButton").addEventListener("click", () => {
    showMessage(
      "Volunteer with us",
      "Add Roger's volunteer email address or signup form here."
    );
  });

  document.querySelector("#eventGrid").addEventListener("click", event => {
    const button = event.target.closest(".event-register");
    if (!button) return;
    showMessage(
      button.dataset.event,
      "Thanks for your interest. Add the real registration form or contact details here."
    );
  });

  document.querySelector("#categoryFilter").addEventListener("change", renderProducts);
  document.querySelector("#sortProducts").addEventListener("change", renderProducts);

  document.querySelector("#productGrid").addEventListener("click", event => {
    const button = event.target.closest(".view-product");
    if (button) openProduct(button.dataset.productId);
  });

  document.querySelector("#productSizes").addEventListener("click", event => {
    const button = event.target.closest(".size-option");
    if (!button) return;
    selectedSize = button.dataset.size;
    document.querySelectorAll(".size-option").forEach(option =>
      option.classList.toggle("selected", option === button)
    );
  });

  document.querySelector("#addToCartButton").addEventListener("click", () => {
    if (!currentProduct) return;
    if (currentProduct.sizes.length && !selectedSize) {
      showToast("Please choose a size first.");
      return;
    }
    const quantity = Math.max(1, Number(document.querySelector("#productQuantity").value) || 1);
    showToast(`${quantity} × ${currentProduct.name} added${selectedSize ? ` (${selectedSize})` : ""}.`);
  });

  const hashView = window.location.hash.replace("#", "");
  showView(["home", "events", "shop"].includes(hashView) ? hashView : "home");
});