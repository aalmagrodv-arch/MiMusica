const STORAGE_KEY = "musiclog_items_v1";
const ITEMS_PER_PAGE = 5;

const form = document.getElementById("musicForm");
const formTitle = document.getElementById("formTitle");
const itemIdInput = document.getElementById("itemId");
const artistInput = document.getElementById("artist");
const titleInput = document.getElementById("title");
const typeInput = document.getElementById("type");
const genreInput = document.getElementById("genre");
const statusInput = document.getElementById("status");
const dateAddedInput = document.getElementById("dateAdded");
const noteInput = document.getElementById("note");
const ratingInput = document.getElementById("rating");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importInput = document.getElementById("importInput");
const backupActions = document.querySelector(".backup-actions");

const pendingList = document.getElementById("pendingList");
const heardList = document.getElementById("heardList");
const pendingEmpty = document.getElementById("pendingEmpty");
const heardEmpty = document.getElementById("heardEmpty");
const pendingPagination = document.getElementById("pendingPagination");
const heardPagination = document.getElementById("heardPagination");

const randomBtn = document.getElementById("randomBtn");
const randomBox = document.getElementById("randomBox");
const successToast = document.getElementById("successToast");

const navButtons = document.querySelectorAll(".nav-btn");
const views = document.querySelectorAll(".view");

const ratingModal = document.getElementById("ratingModal");
const ratingModalBackdrop = document.getElementById("ratingModalBackdrop");
const ratingModalText = document.getElementById("ratingModalText");
const ratingModalButtons = document.getElementById("ratingModalButtons");

const ratingModalValue = document.getElementById("ratingModalValue");
const cancelRatingBtn = document.getElementById("cancelRatingBtn");
const saveRatingBtn = document.getElementById("saveRatingBtn");

const deleteModal = document.getElementById("deleteModal");
const deleteModalBackdrop = document.getElementById("deleteModalBackdrop");
const deleteModalText = document.getElementById("deleteModalText");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");

const importModal = document.getElementById("importModal");
const importModalBackdrop = document.getElementById("importModalBackdrop");
const importModalText = document.getElementById("importModalText");
const confirmImportBtn = document.getElementById("confirmImportBtn");
const cancelImportBtn = document.getElementById("cancelImportBtn");

const duplicateModal = document.getElementById("duplicateModal");
const duplicateModalBackdrop = document.getElementById("duplicateModalBackdrop");
const duplicateModalText = document.getElementById("duplicateModalText");
const confirmDuplicateBtn = document.getElementById("confirmDuplicateBtn");
const cancelDuplicateBtn = document.getElementById("cancelDuplicateBtn");

const pendingSearch = document.getElementById("pendingSearch");
const pendingFilterType = document.getElementById("pendingFilterType");
const pendingFilterGenre = document.getElementById("pendingFilterGenre");
const pendingSortBy = document.getElementById("pendingSortBy");

const heardSearch = document.getElementById("heardSearch");
const heardFilterType = document.getElementById("heardFilterType");
const heardFilterGenre = document.getElementById("heardFilterGenre");
const heardSortBy = document.getElementById("heardSortBy");

dateAddedInput.value = getToday();

let items = loadItems();
let pendingHeardItemId = null;
let pendingDeleteItemId = null;
let pendingImportItems = null;
let pendingSaveItemData = null;
let selectedModalRating = "";
let lastViewBeforeEdit = "pending";

const listState = {
  pending: {
    page: 1,
    filterType: "all",
    sortBy: "date_desc"
  },
  heard: {
    page: 1,
    filterType: "all",
    sortBy: "date_desc"
  }
};

setupNavigation();
setupListControls();
switchView("pending");
render();

form.addEventListener("submit", handleSubmit);
cancelEditBtn.addEventListener("click", cancelEdit);
exportBtn.addEventListener("click", exportDataAsJson);
importBtn.addEventListener("click", () => importInput.click());
importInput.addEventListener("change", handleImportJson);
randomBtn.addEventListener("click", showRandomPending);

ratingModalBackdrop.addEventListener("click", closeRatingModal);
cancelRatingBtn.addEventListener("click", closeRatingModal);
saveRatingBtn.addEventListener("click", confirmRatingModal);

deleteModalBackdrop.addEventListener("click", closeDeleteModal);
cancelDeleteBtn.addEventListener("click", closeDeleteModal);
confirmDeleteBtn.addEventListener("click", confirmDeleteModal);

importModalBackdrop.addEventListener("click", closeImportModal);
cancelImportBtn.addEventListener("click", closeImportModal);
confirmImportBtn.addEventListener("click", confirmImportModal);

duplicateModalBackdrop.addEventListener("click", closeDuplicateModal);
cancelDuplicateBtn.addEventListener("click", closeDuplicateModal);
confirmDuplicateBtn.addEventListener("click", confirmDuplicateModal);


if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch((error) => console.log("Service Worker no registrado:", error));
  });
}

function getToday() {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

function formatDisplayDate(dateString) {
  if (!dateString) return "Sin fecha";
  
  const parts = dateString.split("-");
  if (parts.length !== 3) return dateString;
  
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

function loadItems() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}


async function exportDataAsJson() {
  if (!items.length) {
    alert("No hay datos para exportar.");
    return;
  }
  
  const fileName = `mimusica-backup-${getToday()}.json`;
  const dataStr = JSON.stringify(items, null, 2);
  const file = new File([dataStr], fileName, { type: "application/json" });
  
  try {
    if (
      navigator.canShare &&
      navigator.share &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        files: [file]
      });
      showSuccessToast("Archivo listo para compartir");
      return;
    }
  } catch (error) {
    if (error && error.name === "AbortError") {
      return;
    }
  }
  
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  
  showSuccessToast("Datos exportados");
}


function handleImportJson(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      
      if (!Array.isArray(data)) {
        alert("Archivo no válido.");
        return;
      }
      
      const isStructurallyValid = data.every(item =>
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "string" &&
        typeof item.artist === "string" &&
        typeof item.title === "string" &&
        typeof item.type === "string" &&
        typeof item.status === "string" &&
        typeof item.dateAdded === "string"
      );
      
      if (!isStructurallyValid) {
        alert("El archivo no tiene el formato esperado.");
        return;
      }
      
      pendingImportItems = data;
      importModalText.textContent = `Se importarán ${data.length} registros y se reemplazarán todos los datos actuales.`;
      importModal.classList.remove("hidden");
    } catch (error) {
      alert("Error al leer el archivo.");
    }
  };
  
  reader.readAsText(file);
  event.target.value = "";
}


function updateGenreFilterOptions() {
  const genres = [...new Set(
    items
    .map(item => (item.genre || "").trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
  )];
  
  updateGenreSelect(pendingFilterGenre, "Filtrar por género: todos", genres);
  updateGenreSelect(heardFilterGenre, "Filtrar por género: todos", genres);
}

function updateGenreSelect(selectElement, defaultLabel, genres) {
  const currentValue = selectElement.value;
  
  selectElement.innerHTML = "";
  
  const defaultOption = document.createElement("option");
  defaultOption.value = "all";
  defaultOption.textContent = defaultLabel;
  selectElement.appendChild(defaultOption);
  
  genres.forEach((genre) => {
    const option = document.createElement("option");
    option.value = genre;
    option.textContent = genre;
    selectElement.appendChild(option);
  });
  
  const hasCurrentValue = genres.includes(currentValue);
  selectElement.value = hasCurrentValue ? currentValue : "all";
}


function saveItemData(itemData) {
  const existingIndex = items.findIndex(item => item.id === itemData.id);
  const isEditing = existingIndex >= 0;
  
  if (isEditing) {
    items[existingIndex] = itemData;
  } else {
    items.unshift(itemData);
  }
  
  saveItems();
  resetListPage(itemData.status);
  render();
  resetForm();
  
  switchView(itemData.status === "pendiente" ? "pending" : "heard");
  showSuccessToast(isEditing ? "Registro actualizado" : "Registro guardado");
}


function handleSubmit(event) {
  event.preventDefault();
  
  const itemId = itemIdInput.value || String(Date.now());
  const existingItem = items.find(item => item.id === itemId);
  
  const itemData = {
    id: itemId,
    artist: artistInput.value.trim(),
    title: titleInput.value.trim(),
    type: typeInput.value,
    genre: normalizeGenre(genreInput.value),
    status: existingItem ? existingItem.status : statusInput.value,
    dateAdded: dateAddedInput.value,
    dateHeard: existingItem ? (existingItem.dateHeard || "") : "",
    note: noteInput.value.trim(),
    rating: existingItem ? (existingItem.rating || "") : ratingInput.value
  };
  
  if (!itemData.artist || !itemData.title || !itemData.dateAdded) {
    alert("Completa los campos obligatorios.");
    return;
  }
  
  const duplicateItem = items.find(item =>
    item.id !== itemData.id &&
    item.artist.trim().toLowerCase() === itemData.artist.trim().toLowerCase() &&
    item.title.trim().toLowerCase() === itemData.title.trim().toLowerCase() &&
    item.type === itemData.type
  );
  
  if (duplicateItem) {
    pendingSaveItemData = itemData;
    duplicateModalText.textContent =
      `Ya existe "${duplicateItem.artist} — ${duplicateItem.title}" con tipo "${duplicateItem.type}". ¿Quieres guardarlo igualmente?`;
    duplicateModal.classList.remove("hidden");
    return;
  }
  
  saveItemData(itemData);
}

function resetForm() {
  form.reset();
  itemIdInput.value = "";
  dateAddedInput.value = getToday();
  statusInput.value = "pendiente";
  typeInput.value = "Álbum";
  ratingInput.value = "";
  formTitle.textContent = "Añadir registro";
  cancelEditBtn.classList.add("hidden");
  backupActions.classList.remove("hidden");
}

function cancelEdit() {
  resetForm();
  switchView(lastViewBeforeEdit);
}


function setupListControls() {
  pendingSearch.addEventListener("input", () => {
    listState.pending.page = 1;
    render();
  });
  
  pendingFilterType.addEventListener("change", () => {
    listState.pending.filterType = pendingFilterType.value;
    listState.pending.page = 1;
    render();
  });
  
  pendingFilterGenre.addEventListener("change", () => {
    listState.pending.page = 1;
    render();
  });
  
  pendingSortBy.addEventListener("change", () => {
    listState.pending.sortBy = pendingSortBy.value;
    listState.pending.page = 1;
    render();
  });
  
  heardSearch.addEventListener("input", () => {
    listState.heard.page = 1;
    render();
  });
  
  heardFilterType.addEventListener("change", () => {
    listState.heard.filterType = heardFilterType.value;
    listState.heard.page = 1;
    render();
  });
  
  heardFilterGenre.addEventListener("change", () => {
    listState.heard.page = 1;
    render();
  });
  
  heardSortBy.addEventListener("change", () => {
    listState.heard.sortBy = heardSortBy.value;
    listState.heard.page = 1;
    render();
  });
}


function render() {
  updateGenreFilterOptions();
  renderList("pending");
  renderList("heard");
}


function renderList(listName) {
  const isPending = listName === "pending";
  const statusValue = isPending ? "pendiente" : "escuchado";
  const container = isPending ? pendingList : heardList;
  const emptyText = isPending ? pendingEmpty : heardEmpty;
  const paginationContainer = isPending ? pendingPagination : heardPagination;
  const state = listState[listName];

  container.innerHTML = "";
  paginationContainer.innerHTML = "";

  let filteredItems = items.filter(item => item.status === statusValue);

  const searchValue = isPending ?
    pendingSearch.value.trim().toLowerCase() :
    heardSearch.value.trim().toLowerCase();
  
  if (searchValue) {
    filteredItems = filteredItems.filter(item => {
      const artist = (item.artist || "").toLowerCase();
      const title = (item.title || "").toLowerCase();
      return artist.includes(searchValue) || title.includes(searchValue);
    });
  }
  
  if (state.filterType !== "all") {
    filteredItems = filteredItems.filter(item => item.type === state.filterType);
  }
  
  const genreFilterValue = isPending ?
    pendingFilterGenre.value :
    heardFilterGenre.value;
  
  if (genreFilterValue !== "all") {
    filteredItems = filteredItems.filter(item => (item.genre || "") === genreFilterValue);
  }
  
  filteredItems = sortItems(filteredItems, state.sortBy);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));

  if (state.page > totalPages) {
    state.page = totalPages;
  }

  const start = (state.page - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(start, end);

  paginatedItems.forEach(item => {
    container.appendChild(createItemCard(item));
  });

  emptyText.classList.toggle("hidden", filteredItems.length > 0);

  if (filteredItems.length > 0) {
    renderPagination(
      paginationContainer,
      state.page,
      totalPages,
      (newPage) => {
        state.page = newPage;
        render();
      },
      true
    );
  } else {
    paginationContainer.classList.add("hidden");
  }
}

function sortItems(itemsToSort, sortBy) {
  const sorted = [...itemsToSort];
  
  sorted.sort((a, b) => {
    const aMainDate = a.status === "escuchado" ? (a.dateHeard || a.dateAdded) : a.dateAdded;
    const bMainDate = b.status === "escuchado" ? (b.dateHeard || b.dateAdded) : b.dateAdded;
    
    switch (sortBy) {
      case "date_asc":
        return aMainDate.localeCompare(bMainDate);
        
      case "date_desc":
        return bMainDate.localeCompare(aMainDate);
        
      case "artist_asc":
        return a.artist.localeCompare(b.artist, "es", { sensitivity: "base" });
        
      case "artist_desc":
        return b.artist.localeCompare(a.artist, "es", { sensitivity: "base" });
        
      case "title_asc":
        return a.title.localeCompare(b.title, "es", { sensitivity: "base" });
        
      case "title_desc":
        return b.title.localeCompare(a.title, "es", { sensitivity: "base" });
        
      case "rating_asc":
        return getNumericRating(a.rating) - getNumericRating(b.rating);
        
      case "rating_desc":
        return getNumericRating(b.rating) - getNumericRating(a.rating);
        
      default:
        return 0;
    }
  });
  
  return sorted;
}

function getNumericRating(value) {
  return Number(value || 0);
}


function createItemCard(item) {
  const card = document.createElement("article");
  card.className = "item closed";

    const isPending = item.status === "pendiente";
    const ratingText = item.rating ? `${item.rating}/10` : "Sin puntuación";
    const addedDateText = formatDisplayDate(item.dateAdded);
    const heardDateText = formatDisplayDate(item.dateHeard);
    const genreHtml = item.genre ? `<div><strong>Género:</strong> ${escapeHtml(item.genre)}</div>` : "";
    const noteHtml = item.note ? `<div class="note">${escapeHtml(item.note)}</div>` : "";
    
  card.innerHTML = `
    <div class="item-summary">
      <div class="item-top">
        <div>
          <h3 class="item-title">${escapeHtml(item.artist)} — ${escapeHtml(item.title)}</h3>
          <p class="item-subtitle">${escapeHtml(item.type)}</p>
        </div>
      </div>

            <div class="meta">
              <div><strong>Añadido:</strong> ${addedDateText}</div>
              ${genreHtml}
              ${isPending ? "" : `<div><strong>Escuchado:</strong> ${heardDateText}</div>`}
              ${isPending ? "" : `<div><strong>Puntuación:</strong> ${ratingText}</div>`}
            </div>

      ${noteHtml}
    </div>

    <div class="item-actions"></div>
  `;

  const summary = card.querySelector(".item-summary");
  const actions = card.querySelector(".item-actions");

  summary.addEventListener("click", () => {
    card.classList.toggle("open");
    card.classList.toggle("closed");
  });

  const editBtn = createButton("Editar", "btn warning", (event) => {
    event.stopPropagation();
    editItem(item.id);
  });
  
  actions.appendChild(editBtn);
  
  if (item.status === "pendiente") {
    const heardBtn = createButton("Escuchado", "btn primary", (event) => {
      event.stopPropagation();
      markAsHeard(item.id);
    });
    actions.appendChild(heardBtn);
  }
  
  const deleteBtn = createButton("Borrar", "btn danger", (event) => {
    event.stopPropagation();
    deleteItem(item.id);
  });
  
  actions.appendChild(deleteBtn);

  return card;
}

function createButton(text, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.className = className;
  button.addEventListener("click", onClick);
  return button;
}


function markAsHeard(id) {
  const item = items.find(item => item.id === id);
  if (!item) return;
  
  openRatingModal(item);
}


function openRatingModal(item) {
  pendingHeardItemId = item.id;
  selectedModalRating = item.rating || "";
  
  ratingModalText.textContent = `${item.artist} — ${item.title}`;
  buildRatingModalButtons();
  updateRatingModalUI();
  ratingModal.classList.remove("hidden");
}

function closeRatingModal() {
  ratingModal.classList.add("hidden");
  pendingHeardItemId = null;
  selectedModalRating = "";
}

function showSuccessToast(message) {
  successToast.textContent = message;
  successToast.classList.remove("hidden");
  
  clearTimeout(showSuccessToast._timer);
  
  showSuccessToast._timer = setTimeout(() => {
    successToast.classList.add("hidden");
  }, 1800);
}

function buildRatingModalButtons() {
  ratingModalButtons.innerHTML = "";
  
  const ratings = [
    "0.5", "1", "1.5", "2",
    "2.5", "3", "3.5", "4",
    "4.5", "5", "5.5", "6",
    "6.5", "7", "7.5", "8",
    "8.5", "9", "9.5", "10"
  ];
  
  ratings.forEach((rating) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "modal-rating-btn";
    button.textContent = rating;
    button.dataset.value = rating;
    
    button.addEventListener("click", () => {
      selectedModalRating = rating;
      updateRatingModalUI();
    });
    
    ratingModalButtons.appendChild(button);
  });
}

function updateRatingModalUI() {
  const buttons = ratingModalButtons.querySelectorAll(".modal-rating-btn");
  
  buttons.forEach((button) => {
    button.classList.toggle("active", button.dataset.value === selectedModalRating);
  });
  
  ratingModalValue.textContent = selectedModalRating ?
    `Puntuación seleccionada: ${selectedModalRating}/10` :
    "Sin puntuación seleccionada";
}

function confirmRatingModal() {
  if (!pendingHeardItemId) return;
  
  if (!selectedModalRating) {
    alert("Selecciona una puntuación antes de guardar.");
    return;
  }
  
  const item = items.find(item => item.id === pendingHeardItemId);
  if (!item) {
    closeRatingModal();
    return;
  }
  
    item.status = "escuchado";
    item.rating = selectedModalRating;
    item.dateHeard = getToday();
  
    saveItems();
    resetListPage("pendiente");
    resetListPage("escuchado");
    render();
    closeRatingModal();
    switchView("heard");
    showSuccessToast("Guardado en escuchados");
}


function editItem(id) {
  const item = items.find(item => item.id === id);
  if (!item) return;

  itemIdInput.value = item.id;
  artistInput.value = item.artist;
  titleInput.value = item.title;
  typeInput.value = item.type;
  genreInput.value = item.genre || "";
  statusInput.value = "pendiente";
  dateAddedInput.value = item.dateAdded;
  noteInput.value = item.note || "";
    ratingInput.value = item.rating || "";

    formTitle.textContent = "Editar registro";
    cancelEditBtn.classList.remove("hidden");
    
    lastViewBeforeEdit = item.status === "escuchado" ? "heard" : "pending";
    
    backupActions.classList.add("hidden");
    
    switchView("add");
    window.scrollTo({ top: 0, behavior: "smooth" });
}


function deleteItem(id) {
  const item = items.find(item => item.id === id);
  if (!item) return;
  
  pendingDeleteItemId = id;
  deleteModalText.textContent = `¿Seguro que quieres borrar "${item.artist} — ${item.title}"?`;
  deleteModal.classList.remove("hidden");
}


function closeDeleteModal() {
  deleteModal.classList.add("hidden");
  pendingDeleteItemId = null;
}

function confirmDeleteModal() {
  if (!pendingDeleteItemId) return;
  
  items = items.filter(item => item.id !== pendingDeleteItemId);
  saveItems();
  normalizePagesAfterDataChange();
  render();
  closeDeleteModal();
  showSuccessToast("Registro eliminado");
}


function closeImportModal() {
  importModal.classList.add("hidden");
  pendingImportItems = null;
}

function confirmImportModal() {
  if (!pendingImportItems) return;
  
  items = pendingImportItems;
  saveItems();
  
  resetListPage("pendiente");
  resetListPage("escuchado");
  render();
  
  closeImportModal();
  showSuccessToast("Datos importados correctamente");
}

function closeDuplicateModal() {
  duplicateModal.classList.add("hidden");
  pendingSaveItemData = null;
}

function confirmDuplicateModal() {
  if (!pendingSaveItemData) return;
  
  const itemData = pendingSaveItemData;
  closeDuplicateModal();
  saveItemData(itemData);
}

function showRandomPending() {
  const pendingItems = items.filter(item => item.status === "pendiente");
  
  if (pendingItems.length === 0) {
    randomBox.classList.remove("hidden");
    randomBox.innerHTML = `
      <div class="random-box-head">
        <strong>Recomendación aleatoria</strong>
        <button type="button" class="random-close-btn" onclick="closeRandomBox()">✕</button>
      </div>
      <div>No hay pendientes para recomendar.</div>
    `;
    return;
  }
  
  const randomItem = pendingItems[Math.floor(Math.random() * pendingItems.length)];
  
  randomBox.classList.remove("hidden");
  randomBox.innerHTML = `
    <div class="random-box-head">
      <strong>Recomendación aleatoria</strong>
      <button type="button" class="random-close-btn" onclick="closeRandomBox()">✕</button>
    </div>
    <div>${escapeHtml(randomItem.artist)} — ${escapeHtml(randomItem.title)} (${escapeHtml(randomItem.type)})</div>
  `;
}


function closeRandomBox() {
  randomBox.classList.add("hidden");
  randomBox.innerHTML = "";
}


function renderPagination(container, currentPage, totalPages, onPageChange, show) {
  container.innerHTML = "";
  container.classList.toggle("hidden", !show || totalPages <= 1);
  
  if (!show || totalPages <= 1) return;
  
  const prevButton = document.createElement("button");
  prevButton.type = "button";
  prevButton.className = "page-btn";
  prevButton.textContent = "Anterior";
  prevButton.disabled = currentPage === 1;
  prevButton.addEventListener("click", () => onPageChange(currentPage - 1));
  
  const pageSelect = document.createElement("select");
  pageSelect.className = "page-select";
  
  for (let page = 1; page <= totalPages; page++) {
    const option = document.createElement("option");
    option.value = page;
    option.textContent = `Página ${page}`;
    if (page === currentPage) {
      option.selected = true;
    }
    pageSelect.appendChild(option);
  }
  
  pageSelect.addEventListener("change", (event) => {
    onPageChange(Number(event.target.value));
  });
  
  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.className = "page-btn";
  nextButton.textContent = "Siguiente";
  nextButton.disabled = currentPage === totalPages;
  nextButton.addEventListener("click", () => onPageChange(currentPage + 1));
  
  container.appendChild(prevButton);
  container.appendChild(pageSelect);
  container.appendChild(nextButton);
}


function normalizePagesAfterDataChange() {
  ["pending", "heard"].forEach(listName => {
    const state = listState[listName];
    const isPending = listName === "pending";
    const statusValue = isPending ? "pendiente" : "escuchado";
    
    let filteredItems = items.filter(item => item.status === statusValue);
    
    const searchValue = isPending ?
      pendingSearch.value.trim().toLowerCase() :
      heardSearch.value.trim().toLowerCase();
    
    if (searchValue) {
      filteredItems = filteredItems.filter(item => {
        const artist = (item.artist || "").toLowerCase();
        const title = (item.title || "").toLowerCase();
        return artist.includes(searchValue) || title.includes(searchValue);
      });
    }
    
    if (state.filterType !== "all") {
      filteredItems = filteredItems.filter(item => item.type === state.filterType);
    }
    
    const genreFilterValue = isPending ?
      pendingFilterGenre.value :
      heardFilterGenre.value;
    
    if (genreFilterValue !== "all") {
      filteredItems = filteredItems.filter(item => (item.genre || "") === genreFilterValue);
    }
    
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
    
    if (state.page > totalPages) {
      state.page = totalPages;
    }
  });
}


function resetListPage(status) {
  if (status === "pendiente") {
    listState.pending.page = 1;
  } else if (status === "escuchado") {
    listState.heard.page = 1;
  }
}


function resetAllListControls() {
  pendingSearch.value = "";
  pendingFilterType.value = "all";
  pendingFilterGenre.value = "all";
  pendingSortBy.value = "date_desc";
  
  heardSearch.value = "";
  heardFilterType.value = "all";
  heardFilterGenre.value = "all";
  heardSortBy.value = "date_desc";
  
  listState.pending.page = 1;
  listState.pending.filterType = "all";
  listState.pending.sortBy = "date_desc";
  
  listState.heard.page = 1;
  listState.heard.filterType = "all";
  listState.heard.sortBy = "date_desc";
  
  closeRandomBox();
}


function setupNavigation() {
  navButtons.forEach(button => {
    button.addEventListener("click", () => {
      const viewName = button.dataset.view;
      switchView(viewName);
    });
  });
}


function switchView(viewName) {
  const currentActiveView = document.querySelector(".view.active");
  const currentViewName = currentActiveView ? currentActiveView.id.replace("view-", "") : null;
  
  if (currentViewName && currentViewName !== viewName) {
    resetAllListControls();
  }
  
  views.forEach(view => {
    view.classList.remove("active");
  });
  
  navButtons.forEach(button => {
    button.classList.remove("active");
  });
  
  document.getElementById(`view-${viewName}`).classList.add("active");
  document.querySelector(`.nav-btn[data-view="${viewName}"]`).classList.add("active");
  
  render();
}


function normalizeGenre(value) {
  if (!value) return "";
  
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^\w/, c => c.toUpperCase());
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}