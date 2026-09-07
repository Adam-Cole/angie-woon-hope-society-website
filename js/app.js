const views = {
  home: document.querySelector("#homeView"),
  events: document.querySelector("#eventsView"),
  shop: document.querySelector("#shopView"),
  prizes: document.querySelector("#prizesView"),
  product: document.querySelector("#productView"),
  cart: document.querySelector("#cartView")
};

let events = [];
let products = [];
let currentProduct = null;
let selectedSize = "";
let toastTimer = null;

const CART_KEY = "awhs-cart";
let cart = loadCart();
let selectedDonationAmount = 0;

async function loadEvents() {
  const eventGrid = document.querySelector("#eventGrid");
  if (!eventGrid) return;

  try {
    const response = await fetch("./data/events.json");
    if (!response.ok) throw new Error(`Unable to load events: ${response.status}`);

    events = await response.json();
    events.sort((a, b) => new Date(a.date) - new Date(b.date));
    renderEvents(events);
    renderFeaturedEvent(events);
  } catch (error) {
    console.error("Event loading error:", error);
    eventGrid.innerHTML = `
      <p class="events-error">
        Events could not be loaded right now. Please check back soon.
      </p>`;
  }
}

async function loadProducts() {
  const productGrid = document.querySelector("#productGrid");
  if (!productGrid) return;

  try {
    const response = await fetch("./data/products.json");
    if (!response.ok) throw new Error(`Unable to load products: ${response.status}`);

    products = await response.json();
    products = products.filter(product => product.available !== false);
    renderProducts();
  } catch (error) {
    console.error("Product loading error:", error);
    productGrid.innerHTML = `
      <p class="products-error">
        Products could not be loaded right now. Please check back soon.
      </p>`;
  }
}

function renderEvents(eventList) {
  const eventGrid = document.querySelector("#eventGrid");
  if (!eventGrid) return;

  if (!eventList.length) {
    eventGrid.innerHTML = `<p class="events-empty">There are no upcoming events currently scheduled.</p>`;
    return;
  }

  eventGrid.innerHTML = eventList.map(event => createEventCard(event)).join("");
}

function createEventCard(event) {
  const registrationText = event.registrationOpen ? "Register now →" : "Register interest →";

  return `
    <article class="event-card ${event.theme}-event">
      <img src="${event.image}" alt="${event.imageAlt}">
      <div class="event-card-body">
        <p class="eyebrow">${event.displayDate}</p>
        <h3>${event.title} <span aria-hidden="true">${event.emoji}</span></h3>
        <p class="event-meta">${event.type} • Community • Fundraising</p>
        <p>${event.description}</p>
        <p><strong>Location:</strong> ${event.location}</p>
        <p><strong>Time:</strong> ${event.time}</p>
        <p>${event.dressMessage}</p>
        <button class="text-button event-register" type="button"
                data-event="${event.title}" data-event-id="${event.id}">
          ${registrationText}
        </button>
      </div>
    </article>`;
}

function renderFeaturedEvent(eventList) {
  const section = document.querySelector("#featuredEvent");
  const image = document.querySelector("#featuredEventImage");
  const title = document.querySelector("#featuredEventTitle");
  const description = document.querySelector("#featuredEventDescription");
  const meta = document.querySelector("#featuredEventMeta");
  if (!section || !image || !title || !description || !meta) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = eventList
    .filter(event => new Date(`${event.date}T00:00:00`) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const nextEvent = upcomingEvents[0];
  if (!nextEvent) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");
  image.src = nextEvent.image;
  image.alt = nextEvent.imageAlt || nextEvent.title;
  title.textContent = `${nextEvent.title}${nextEvent.emoji ? ` ${nextEvent.emoji}` : ""}`;
  description.textContent = nextEvent.description;

  const details = [nextEvent.displayDate, nextEvent.location, nextEvent.time]
    .filter(detail => detail && detail.toLowerCase() !== "to be announced");
  meta.textContent = details.join(" · ");
}

function showView(name, { updateHash = false, scroll = true } = {}) {
  Object.values(views).filter(Boolean).forEach(view => view.classList.add("hidden"));
  const target = views[name] || views.home;
  target.classList.remove("hidden");

  document.querySelectorAll("[data-view-link]").forEach(link => {
    const active = link.dataset.viewLink === name;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  const nav = document.querySelector("#mainNav");
  const menu = document.querySelector("#menuButton");
  if (nav) nav.classList.remove("open");
  if (menu) menu.setAttribute("aria-expanded", "false");

  if (updateHash) history.pushState(null, "", `#${name}`);
  if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
}

function navigateToView(name) {
  closeCartDrawer();
  showView(name, { updateHash: true });
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function showMessage(title, text) {
  const dialog = document.querySelector("#messageDialog");
  const titleElement = document.querySelector("#messageTitle");
  const textElement = document.querySelector("#messageText");

  if (!dialog || !titleElement || !textElement) {
    showToast(text);
    return;
  }

  titleElement.textContent = title;
  textElement.textContent = text;
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
  const count = document.querySelector("#productCount");
  if (!grid || !count) return;

  count.textContent = `${list.length} product${list.length === 1 ? "" : "s"}`;
  grid.innerHTML = list.map(product => `
    <article class="product-card">
      <img src="${product.image}" alt="${product.imageAlt || product.name}">
      <div class="product-card-body">
        <p class="eyebrow">${product.category}</p>
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <div class="product-card-footer">
          <strong>$${Number(product.price).toFixed(2)}</strong>
          <button class="text-button view-product" type="button" data-product-id="${product.id}">
            View item →
          </button>
        </div>
      </div>
    </article>`).join("");
}

function openProduct(productId, { updateHash = true } = {}) {
  const product = products.find(item => String(item.id) === String(productId));
  if (!product) {
    if (products.length) showView("shop", { updateHash: true });
    return;
  }

  currentProduct = product;
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  selectedSize = sizes.length === 1 ? sizes[0] : "";

  document.querySelector("#productImage").src = product.image;
  document.querySelector("#productImage").alt = product.imageAlt || product.name;
  document.querySelector("#productCategory").textContent = product.category;
  document.querySelector("#productTitle").textContent = product.name;
  document.querySelector("#productPrice").textContent = `$${Number(product.price).toFixed(2)}`;
  document.querySelector("#productDescription").textContent = product.description;
  document.querySelector("#breadcrumbProduct").textContent = product.name;
  document.querySelector("#productQuantity").value = 1;

  const sizeGroup = document.querySelector("#sizeGroup");
  const sizeRow = document.querySelector("#productSizes");

  if (sizes.length) {
    sizeGroup.classList.remove("hidden");
    sizeRow.innerHTML = sizes.map(size => `
      <button type="button" class="size-option${selectedSize === size ? " selected" : ""}"
              data-size="${size}">${size}</button>`).join("");
  } else {
    sizeGroup.classList.add("hidden");
    sizeRow.innerHTML = "";
  }

  showView("product");
  if (updateHash) history.pushState(null, "", `#product/${product.id}`);
}

/* -------------------------
   CART DATA
   ------------------------- */

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.warn("Could not read saved cart:", error);
    return [];
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCart();
}

function cartItemKey(productId, size = "") {
  return `${productId}::${size || ""}`;
}

function addCurrentProductToCart(quantity) {
  if (!currentProduct) return;

  const sizes = Array.isArray(currentProduct.sizes) ? currentProduct.sizes : [];
  if (sizes.length && !selectedSize) {
    showToast("Please choose a size first.");
    return;
  }

  const key = cartItemKey(currentProduct.id, selectedSize);
  const existing = cart.find(item => item.key === key);

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      key,
      productId: currentProduct.id,
      name: currentProduct.name,
      price: Number(currentProduct.price),
      image: currentProduct.image,
      imageAlt: currentProduct.imageAlt || currentProduct.name,
      size: selectedSize,
      quantity
    });
  }

  saveCart();
  openCartDrawer();
  showToast(`${quantity} × ${currentProduct.name} added to your cart.`);
}

function openDonationPopdown(amount = 0) {
  const popdown = document.querySelector("#donationPopdown");
  const customInput = document.querySelector("#customDonationAmount");
  if (!popdown || !customInput) return;

  selectedDonationAmount = Number(amount) || 0;
  customInput.value = selectedDonationAmount ? String(selectedDonationAmount) : "";

  document.querySelectorAll(".donation-amount").forEach(button => {
    button.classList.toggle("selected", Number(button.dataset.donationAmount) === selectedDonationAmount);
  });

  popdown.classList.add("show");
  popdown.setAttribute("aria-hidden", "false");
}

function closeDonationPopdown() {
  const popdown = document.querySelector("#donationPopdown");
  if (!popdown) return;
  popdown.classList.remove("show");
  popdown.setAttribute("aria-hidden", "true");
}

function addDonationToCart(amount) {
  const donationAmount = Number(amount);
  if (!Number.isFinite(donationAmount) || donationAmount < 1) {
    showToast("Please enter a donation amount of at least $1.");
    return;
  }

  const existing = cart.find(item => item.type === "donation");

  if (existing) {
    existing.price += donationAmount;
  } else {
    cart.push({
      key: "donation",
      type: "donation",
      name: "Donation",
      price: donationAmount,
      quantity: 1
    });
  }

  saveCart();
  closeDonationPopdown();
  openCartDrawer();
  showToast(`$${donationAmount.toFixed(2)} donation added to your cart.`);
}

function setDonationAmount(amount) {
  selectedDonationAmount = Number(amount) || 0;
  const customInput = document.querySelector("#customDonationAmount");
  if (customInput) customInput.value = selectedDonationAmount ? String(selectedDonationAmount) : "";

  document.querySelectorAll(".donation-amount").forEach(button => {
    button.classList.toggle("selected", Number(button.dataset.donationAmount) === selectedDonationAmount);
  });
}

function changeCartQuantity(key, amount) {
  const item = cart.find(entry => entry.key === key);
  if (!item) return;

  item.quantity += amount;
  if (item.quantity <= 0) cart = cart.filter(entry => entry.key !== key);
  saveCart();
}

function removeCartItem(key) {
  cart = cart.filter(item => item.key !== key);
  saveCart();
}

function getCartCount() {
  return cart.reduce((total, item) => total + item.quantity, 0);
}

function getCartSubtotal() {
  return cart.reduce((total, item) => total + item.price * item.quantity, 0);
}

function cartItemMarkup(item) {
  if (item.type === "donation") {
    return `
      <article class="cart-item donation-item" data-cart-key="${item.key}">
        <div class="donation-item-icon" aria-hidden="true">♥</div>
        <div class="cart-item-main">
          <div class="cart-item-top">
            <h3 class="cart-item-name">Donation</h3>
            <strong class="cart-item-price">$${Number(item.price).toFixed(2)}</strong>
          </div>
          <p class="cart-item-meta">Angie Woon Hope Society</p>
          <div class="donation-item-actions">
            <button class="cart-remove" type="button" data-cart-action="remove" data-cart-key="${item.key}">Remove</button>
          </div>
        </div>
      </article>`;
  }

  return `
    <article class="cart-item" data-cart-key="${item.key}">
      <img class="cart-item-image" src="${item.image}" alt="${item.imageAlt || item.name}">
      <div class="cart-item-main">
        <div class="cart-item-top">
          <h3 class="cart-item-name">${item.name}</h3>
          <strong class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</strong>
        </div>
        <p class="cart-item-meta">${item.size ? `Size: ${item.size} · ` : ""}$${item.price.toFixed(2)} each</p>
        <div class="cart-item-actions">
          <div class="quantity-stepper" aria-label="Quantity for ${item.name}">
            <button type="button" data-cart-action="decrease" data-cart-key="${item.key}" aria-label="Decrease quantity">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-cart-action="increase" data-cart-key="${item.key}" aria-label="Increase quantity">+</button>
          </div>
          <button class="cart-remove" type="button" data-cart-action="remove" data-cart-key="${item.key}">Remove</button>
        </div>
      </div>
    </article>`;
}

function renderCart() {
  const count = getCartCount();
  const subtotal = getCartSubtotal();
  const countElement = document.querySelector("#cartCount");
  const drawerItems = document.querySelector("#cartDrawerItems");
  const pageItems = document.querySelector("#cartPageItems");
  const drawerSubtotal = document.querySelector("#cartDrawerSubtotal");
  const pageSubtotal = document.querySelector("#cartPageSubtotal");
  const checkoutButton = document.querySelector("#checkoutButton");

  if (countElement) {
    countElement.textContent = count;
    countElement.setAttribute("aria-label", `${count} item${count === 1 ? "" : "s"} in cart`);
  }

  const contents = cart.length
    ? cart.map(cartItemMarkup).join("")
    : `<p class="cart-empty">Your cart is empty. Add something from the shop and it will appear here.</p>`;

  if (drawerItems) drawerItems.innerHTML = contents;
  if (pageItems) pageItems.innerHTML = contents;
  if (drawerSubtotal) drawerSubtotal.textContent = `$${subtotal.toFixed(2)}`;
  if (pageSubtotal) pageSubtotal.textContent = `$${subtotal.toFixed(2)}`;
  if (checkoutButton) checkoutButton.disabled = cart.length === 0;
}

function openCartDrawer() {
  const drawer = document.querySelector("#cartDrawer");
  const overlay = document.querySelector("#cartOverlay");
  if (!drawer || !overlay) return;

  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add("show"));
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("cart-open");
}

function closeCartDrawer() {
  const drawer = document.querySelector("#cartDrawer");
  const overlay = document.querySelector("#cartOverlay");
  if (!drawer || !overlay) return;

  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  overlay.classList.remove("show");
  document.body.classList.remove("cart-open");
  setTimeout(() => {
    if (!overlay.classList.contains("show")) overlay.hidden = true;
  }, 280);
}

function handleCartAction(event) {
  const control = event.target.closest("[data-cart-action]");
  if (!control) return;

  const key = control.dataset.cartKey;
  const action = control.dataset.cartAction;
  if (action === "increase") changeCartQuantity(key, 1);
  if (action === "decrease") changeCartQuantity(key, -1);
  if (action === "remove") removeCartItem(key);
}

/* -------------------------
   HASH ROUTING
   ------------------------- */

function handleRoute() {
  const hash = window.location.hash.replace(/^#/, "") || "home";

  if (hash.startsWith("product/")) {
    const productId = hash.split("/")[1];
    if (products.length) openProduct(productId, { updateHash: false });
    return;
  }

  if (hash === "donate") {
    showView("home", { scroll: false });
    requestAnimationFrame(() => {
      document.querySelector("#donate")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return;
  }

  if (["home", "events", "shop", "prizes", "cart"].includes(hash)) {
    showView(hash, { scroll: false });
  } else {
    showView("home", { scroll: false });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#year").textContent = new Date().getFullYear();
  renderCart();

  loadEvents();
  loadProducts().then(handleRoute);

  document.querySelectorAll("[data-view-link], [data-show-view]").forEach(control => {
    control.addEventListener("click", event => {
      event.preventDefault();
      navigateToView(control.dataset.viewLink || control.dataset.showView);
    });
  });

  document.querySelector("#brandHome")?.addEventListener("click", event => {
    event.preventDefault();
    navigateToView("home");
  });

  document.querySelector("#menuButton")?.addEventListener("click", () => {
    const nav = document.querySelector("#mainNav");
    const open = nav.classList.toggle("open");
    document.querySelector("#menuButton").setAttribute("aria-expanded", String(open));
  });

  document.querySelector("#aboutLink")?.addEventListener("click", () => {
    document.querySelector("#aboutDialog")?.showModal();
  });

  document.querySelectorAll(".dialog-close").forEach(button => {
    button.addEventListener("click", () => button.closest("dialog")?.close());
  });

  document.querySelector("#messageOkay")?.addEventListener("click", () => {
    document.querySelector("#messageDialog")?.close();
  });

  document.querySelectorAll("dialog").forEach(dialog => {
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
  });

  document.querySelector("#volunteerButton")?.addEventListener("click", () => {
    showMessage("Volunteer with us", "Add Roger's volunteer email address or signup form here.");
  });

  document.querySelector("#eventGrid")?.addEventListener("click", event => {
    const button = event.target.closest(".event-register");
    if (!button) return;
    showMessage(button.dataset.event, "Thanks for your interest. Add the real registration form or contact details here.");
  });

  document.querySelector("#categoryFilter")?.addEventListener("change", renderProducts);
  document.querySelector("#sortProducts")?.addEventListener("change", renderProducts);

  document.querySelector("#productGrid")?.addEventListener("click", event => {
    const button = event.target.closest(".view-product");
    if (button) openProduct(button.dataset.productId);
  });

  document.querySelector("#productSizes")?.addEventListener("click", event => {
    const button = event.target.closest(".size-option");
    if (!button) return;

    selectedSize = button.dataset.size;
    document.querySelectorAll(".size-option").forEach(option =>
      option.classList.toggle("selected", option === button)
    );
  });

  document.querySelector("#addToCartButton")?.addEventListener("click", () => {
    if (!currentProduct) return;
    const quantity = Math.max(1, Number(document.querySelector("#productQuantity").value) || 1);
    addCurrentProductToCart(quantity);
  });

  document.querySelectorAll("[data-open-donation]").forEach(control => {
    control.addEventListener("click", event => {
      event.preventDefault();
      openDonationPopdown();
    });
  });

  document.querySelector("#donationPopdownClose")?.addEventListener("click", closeDonationPopdown);

  document.querySelector("#donationAmounts")?.addEventListener("click", event => {
    const button = event.target.closest(".donation-amount");
    if (!button) return;
    setDonationAmount(button.dataset.donationAmount);
  });

  document.querySelector("#customDonationAmount")?.addEventListener("input", event => {
    selectedDonationAmount = Math.max(0, Number(event.target.value) || 0);
    document.querySelectorAll(".donation-amount").forEach(button => button.classList.remove("selected"));
  });

  document.querySelector("#addDonationToCartButton")?.addEventListener("click", () => {
    const customValue = Number(document.querySelector("#customDonationAmount")?.value) || 0;
    addDonationToCart(customValue || selectedDonationAmount);
  });

  document.querySelector("#cartButton")?.addEventListener("click", openCartDrawer);
  document.querySelector("#cartDrawerClose")?.addEventListener("click", closeCartDrawer);
  document.querySelector("#cartOverlay")?.addEventListener("click", closeCartDrawer);

  document.querySelector("#viewFullCartButton")?.addEventListener("click", () => {
    navigateToView("cart");
  });

  document.querySelector("#cartDrawerItems")?.addEventListener("click", handleCartAction);
  document.querySelector("#cartPageItems")?.addEventListener("click", handleCartAction);

  document.querySelector("#checkoutButton")?.addEventListener("click", () => {
    showMessage(
      "Checkout coming soon",
      "The cart is ready. Connect this button to the charity's chosen payment or checkout provider when you are ready to accept orders."
    );
  });

  window.addEventListener("hashchange", handleRoute);

  document.addEventListener("click", event => {
    const popdown = document.querySelector("#donationPopdown");
    if (!popdown?.classList.contains("show")) return;
    if (popdown.contains(event.target) || event.target.closest("[data-open-donation]")) return;
    closeDonationPopdown();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeCartDrawer();
      closeDonationPopdown();
    }
  });
});
