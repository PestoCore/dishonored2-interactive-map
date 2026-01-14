var map = L.map('map', { attributionControl: false }).setView([0.000404314, -5.56205e-05], 20);

L.control.attribution({ prefix: false }).addTo(map);

const southWest = L.latLng(-0.00013142824172306136, -0.000667870044708252);
const northEast = L.latLng(0.0008609890937456173, 0.0005444884300231935);
const bounds = L.latLngBounds(southWest, northEast);

const tile_options = {
    minZoom: 19,
    maxZoom: 21,
    bounds: bounds,
    tms: false,
    attribution: 'PestoCore'
};

// xyz tiles layers
var basement1 = L.tileLayer('tiles/B1/{z}/{x}/{y}.png', tile_options);
var floor1 = L.tileLayer('tiles/F1/{z}/{x}/{y}.png', tile_options);
var floor2 = L.tileLayer('tiles/F2/{z}/{x}/{y}.png', tile_options);
var floor3 = L.tileLayer('tiles/F3/{z}/{x}/{y}.png', tile_options);
var floor4 = L.tileLayer('tiles/F4/{z}/{x}/{y}.png', tile_options);
var floor5 = L.tileLayer('tiles/F5/{z}/{x}/{y}.png', tile_options);
var floor6 = L.tileLayer('tiles/F6/{z}/{x}/{y}.png', tile_options);

// globals
const baseMaps = {
    "Basement 1": basement1,
    "Floor 1": floor1,
    "Floor 2": floor2,
    "Floor 3": floor3,
    "Floor 4": floor4,
    "Floor 5": floor5,
    "Floor 6": floor6
};

const levelMap = {
    "Basement 1": -1,
    "Floor 1": 1,
    "Floor 2": 2,
    "Floor 3": 3,
    "Floor 4": 4,
    "Floor 5": 5,
    "Floor 6": 6
};

const floorsConfig = [
    { name: "Floor 6",    layer: floor6,    level: 6,  label: "6th Floor" },
    { name: "Floor 5",    layer: floor5,    level: 5,  label: "5th Floor" },
    { name: "Floor 4",    layer: floor4,    level: 4,  label: "4th Floor" },
    { name: "Floor 3",    layer: floor3,    level: 3,  label: "3rd Floor" },
    { name: "Floor 2",    layer: floor2,    level: 2,  label: "2nd Floor" },
    { name: "Floor 1",    layer: floor1,    level: 1,  label: "1st Floor" },
    { name: "Basement 1", layer: basement1, level: -1, label: "Basement" }
];

const geojsonFiles = [
    { name: "Audiographs", url: "geojson/audiograph.geojson", color: "#e74c3c", icon: redIcon, faIcon: "fa-volume-up" },
    { name: "Blueprints",  url: "geojson/blueprint.geojson",  color: "#3498db", icon: blueIcon, faIcon: "fa-map-o" },
    { name: "Bonecharms",  url: "geojson/bonecharm.geojson",  color: "#f1c40f", icon: yellowIcon, faIcon: "fa-magic" },
    { name: "Notes",       url: "geojson/note.geojson",       color: "#95a5a6", icon: greyIcon, faIcon: "fa-sticky-note-o" },
    { name: "Painting",    url: "geojson/painting.geojson",   color: "#e67e22", icon: orangeIcon, faIcon: "fa-picture-o" },
    { name: "Runes",       url: "geojson/rune.geojson",       color: "#9b59b6", icon: violetIcon, faIcon: "fa-diamond" },
    { name: "Shrines",     url: "geojson/shrine.geojson",     color: "#2ecc71", icon: greenIcon, faIcon: "fa-fire" }
];

// initial values
const categoryLayers = {};
let currentLevel = 1;
let activeBaseLayer = floor1;


// functions
function initFloorSelector() {
    const container = document.getElementById('sidebar-floors');
    if(!container) return;
    container.innerHTML = '';

    floorsConfig.forEach(floor => {
        const btn = document.createElement('div');
        btn.className = 'floor-btn';
        btn.innerText = floor.label;
        btn.dataset.level = floor.level;
        if (floor.level === currentLevel) btn.classList.add('active');
        btn.onclick = () => changeFloor(floor, btn);
        container.appendChild(btn);
    });
}

function changeFloor(floorConfig, btnElement) {
    if (currentLevel === floorConfig.level) return;
    map.removeLayer(activeBaseLayer);
    map.addLayer(floorConfig.layer);
    activeBaseLayer = floorConfig.layer;
    currentLevel = floorConfig.level;
    updateAllLayers(currentLevel);
    document.querySelectorAll('.floor-btn').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
}

function initGeoJsonLayers() {
    const sidebarContainer = document.getElementById('sidebar-categories');
    if(!sidebarContainer) return;
    sidebarContainer.innerHTML = '';

    geojsonFiles.forEach(fileConfig => {
        const layer = L.Proj.geoJson(null, {
            pointToLayer: function (feature, latlng) {
                return L.marker(latlng, { icon: fileConfig.icon });
            },
            onEachFeature: function (feature, layer) {
                const props = feature.properties;
                const title = props.title || fileConfig.name;

                layer.bindTooltip(title, {
                    sticky: false,
                    direction: 'right',
                    offset: [10, -20]
                });

                let popupContent = '<div class="map-popup-content">';
                popupContent += `<h3>${props.title || fileConfig.name}</h3>`;
                if (props.img) {
                    const imgSrc = `images/${props.img + '.jpg'}`;
                    popupContent += `
                        <div class="popup-image">
                            <img src="${imgSrc}" 
                                alt="${props.title}" 
                                onclick="openLightbox('${imgSrc}')">
                        </div>`;
                }
                if (props.desc) {
                    popupContent += `<p>${props.desc}</p>`;
                }
                popupContent += '</div>';
                layer.bindPopup(popupContent, { maxWidth: 300 });
            }
        });

        layer.fullData = null;
        categoryLayers[fileConfig.name] = layer;

        fetch(fileConfig.url)
            .then(res => res.json())
            .then(data => {
                layer.fullData = data;
                updateLayerFilter(layer, currentLevel);
                updateSidebarTotalCount(fileConfig.name, data.features.length);
            })
            .catch(err => console.error(err));

        layer.addTo(map);
        createSidebarItem(fileConfig, layer, sidebarContainer);
    });
}

function createSidebarItem(config, layer, container) {
    const item = document.createElement('div');
    item.className = 'category-item';
    item.style.borderLeftColor = config.color;
    item.id = `cat-${config.name.replace(/\s+/g, '-')}`;
    
    item.innerHTML = `
        <div class="category-info">
            <i class="fa ${config.faIcon} category-type-icon"></i>
            <span class="category-name">${config.name}</span>
        </div>
        <i class="fa fa-eye status-icon"></i> 
    `;

    item.onclick = function() {
        const statusIcon = item.querySelector('.status-icon');
        if (map.hasLayer(layer)) {
            map.removeLayer(layer);
            item.classList.add('disabled');
            statusIcon.className = 'fa fa-eye-slash status-icon';
        } else {
            map.addLayer(layer);
            updateLayerFilter(layer, currentLevel); 
            item.classList.remove('disabled');
            statusIcon.className = 'fa fa-eye status-icon';
        }
    };
    container.appendChild(item);
}

function updateSidebarTotalCount(name, total) {
    const itemId = `cat-${name.replace(/\s+/g, '-')}`;
    const item = document.getElementById(itemId);
    if (!item) return;

    const nameSpan = item.querySelector('.category-name');
    if (nameSpan) {
        nameSpan.innerText = `${name} (${total})`;
    }
}

function updateLayerFilter(layer, level) {
    if (!layer.fullData) return;
    layer.clearLayers();
    layer.options.filter = function(feature) {
        return feature.properties.level === level;
    };
    layer.addData(layer.fullData);
}

function updateAllLayers(level) {
    currentLevel = level;
    Object.values(categoryLayers).forEach(layer => {
        updateLayerFilter(layer, level);
    });
}

window.showAllLayers = function() {
    Object.entries(categoryLayers).forEach(([name, layer]) => {
        if (!map.hasLayer(layer)) {
            map.addLayer(layer);
            updateLayerFilter(layer, currentLevel);
            const item = document.getElementById(`cat-${name.replace(/\s+/g, '-')}`);
            if (item) {
                item.classList.remove('disabled');
                const statusIcon = item.querySelector('.status-icon');
                if (statusIcon) statusIcon.className = 'fa fa-eye status-icon';
            }
        }
    });
};

window.hideAllLayers = function() {
    Object.entries(categoryLayers).forEach(([name, layer]) => {
        if (map.hasLayer(layer)) {
            map.removeLayer(layer);
            const item = document.getElementById(`cat-${name.replace(/\s+/g, '-')}`);
            if (item) {
                item.classList.add('disabled');
                const statusIcon = item.querySelector('.status-icon');
                if (statusIcon) statusIcon.className = 'fa fa-eye-slash status-icon';
            }
        }
    });
};

// start of the program
initGeoJsonLayers();
initFloorSelector();
floor1.addTo(map);

var sidebar = L.control.sidebar('sidebar').addTo(map);
sidebar.open('markers');

window.openLightbox = function(src) {
    const overlay = document.getElementById('image-overlay');
    const overlayImg = document.getElementById('overlay-img');
    overlayImg.src = src;
    overlay.classList.add('active');
};

document.addEventListener('DOMContentLoaded', function() {
    const overlay = document.getElementById('image-overlay');
    if (overlay) {
        overlay.addEventListener('click', function() {
            this.classList.remove('active');
        });
    }
});