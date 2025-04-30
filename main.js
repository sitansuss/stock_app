// main.js - COMPLETE FINAL (Hopefully Corrected Duplicates & startswith Error)
import { parseStockData } from './csvParser.js';

// --- DOM Elements ---
const searchBar = document.getElementById('searchBar');
const companyListUl = document.getElementById('companyList');
const selectedCompanyNameH2 = document.getElementById('selectedCompanyName');
const statusContainer = document.getElementById('statusContainer');
const statusText = document.getElementById('statusText');
const spinner = document.getElementById('spinner');
const chartTypeSelect = document.getElementById('chartTypeSelect');
const noDataMessageDiv = document.getElementById('noDataMessage');
const chartContainer = document.getElementById('chartContainer');
const chartCanvas = document.getElementById('dataChart');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const presetDateRangeSelector = document.getElementById('presetDateRangeSelector');
const presetButtons = presetDateRangeSelector.querySelectorAll('.preset-btn');
const resetZoomBtn = document.getElementById('resetZoomBtn');

// --- Application State ---
let allData = {};
let companyNames = [];
let filteredCompanyNames = [];
let selectedCompany = null;
let chartInstance = null;
let currentChartType = 'line';
let currentTheme = localStorage.getItem('theme') || 'light';
let dateRange = { start: null, end: null };
let activePreset = 'MAX';
let isRenderingChart = false; // Flag to prevent overlapping renders

// --- Chart Colors ---
const CHART_DATASET_COLORS = {
    light: { Close: '#007bff', Open: '#ffc107', High: '#28a745', Low: '#dc3545', CandleUp: '#28a745', CandleDown: '#dc3545' },
    dark: { Close: '#4dabf7', Open: '#ffd43b', High: '#69db7c', Low: '#ff8787', CandleUp: '#69db7c', CandleDown: '#ff8787' }
};

// --- Default Chart Axis/Grid Colors (Fallbacks) ---
const DEFAULT_CHART_COLORS = {
    light: { grid: 'rgba(0, 0, 0, 0.1)', tick: '#666', label: '#666', border: '#ddd' },
    dark: { grid: 'rgba(255, 255, 255, 0.15)', tick: '#ccc', label: '#ccc', border: '#555' }
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("[Init] DOMContentLoaded event fired.");
    applyTheme(currentTheme); // Apply theme early
    updateStatus("Initializing application...", false);
    setControlsDisabled(true); // Start disabled

    // Add basic listeners immediately
    searchBar.addEventListener('input', handleSearch);
    companyListUl.addEventListener('click', handleCompanySelect);
    chartTypeSelect.addEventListener('change', handleChartTypeChange);
    themeToggleBtn.addEventListener('click', handleThemeToggle);
    presetDateRangeSelector.addEventListener('click', handlePresetButtonClick);
    resetZoomBtn.addEventListener('click', handleResetZoom);

    // Defer library-dependent logic
    setTimeout(initializeAppData, 50); // Delay initialization slightly

}); // End DOMContentLoaded

// --- App Initialization ---
function initializeAppData() {
    console.log("[Init] Running initializeAppData...");

    // --- Perform Library Checks Here ---
    let libsOK = true;
    if (typeof Papa === 'undefined') { updateStatus("Fatal Error: PapaParse failed.", true); console.error("PapaParse undefined."); libsOK = false; }
    if (typeof Chart === 'undefined') { updateStatus("Fatal Error: Chart.js core failed.", true); console.error("Chart undefined."); libsOK = false; }

    if (!libsOK) {
        setControlsDisabled(true); return; // Stop if core libs failed
    }

    // --- Attempt Explicit Registration for Financial Plugin (Best Effort)---
    if (typeof ChartFinancial !== 'undefined') {
        try {
            // Check if properties exist before registering
            if (ChartFinancial.CandlestickController && ChartFinancial.CandlestickElement) {
                Chart.register(ChartFinancial.CandlestickController, ChartFinancial.CandlestickElement);
                console.log("[Init] Explicitly registered CandlestickController/Element.");
            } else {
                console.warn("[Init] Global ChartFinancial found, but missing expected Controller/Element properties.");
            }
        } catch (registerError) {
             console.error("[Init] Failed to explicitly register financial controllers:", registerError);
        }
    } else {
         console.warn("[Init] Global 'ChartFinancial' object not found for explicit check.");
    }

    // --- Now perform optional checks AFTER potential registration ---
    const isCandlestickRegistered = !!Chart.registry?.controllers?.candlestick;
    const isZoomPluginLoaded = !!Chart.registry?.plugins?.zoom;
    const isDateAdapterLoaded = !(typeof Chart._adapters._date === 'undefined' || typeof dateFns === 'undefined');

    // Log findings
    if (!isCandlestickRegistered) console.warn("Candlestick controller not found."); else console.log("Candlestick controller found.");
    if (typeof Hammer === 'undefined') console.warn("Hammer.js not found."); else console.log("Hammer.js found.");
    if (!isZoomPluginLoaded) console.warn("Zoom plugin not found/registered."); else console.log("Zoom Plugin found.");
    if (!isDateAdapterLoaded) console.warn("Date Adapter/date-fns not found."); else console.log("Date Adapter/date-fns found.");

    // Handle disabling Candlestick option if needed
    const candlestickOption = chartTypeSelect.querySelector('option[value="candlestick"]');
    if (candlestickOption) {
        candlestickOption.disabled = !isCandlestickRegistered;
        candlestickOption.textContent = isCandlestickRegistered ? "Candlestick (OHLC)" : "Candlestick (Plugin Failed)";
         if (!isCandlestickRegistered && currentChartType === 'candlestick') { // Revert if needed
             currentChartType = 'line'; chartTypeSelect.value = 'line';
             setTimeout(()=> updateStatus("Candlestick chart unavailable (plugin failed).", false), 1000);
         }
    }
     // Disable/hide zoom reset button if zoom plugin not loaded
     resetZoomBtn.style.display = isZoomPluginLoaded ? '' : 'none';

    // Proceed with loading data
    loadDataFromFile('dump.csv');
}


// --- Load Data Function ---
async function loadDataFromFile(filename) {
    showLoading(true, `Loading data from ${filename}...`);
    setControlsDisabled(true);
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
        // Fetch
        console.log(`[Main] Fetching: ${filename}`);
        const response = await fetch(filename);
        if (!response.ok) { throw new Error(`HTTP ${response.status} error loading ${filename}.`); }
        const csvText = await response.text();
        if (!csvText || csvText.trim() === '') { throw new Error(`"${filename}" is empty.`); }
        console.log(`[Main] Fetched ${csvText.length} bytes.`);

        // Parse
        showLoading(true, `Parsing data...`);
        allData = await parseStockData(csvText);
        console.log(`[Main] Parsing complete.`);

        // Process
        companyNames = Object.keys(allData).sort((a, b) => a.localeCompare(b));
        filteredCompanyNames = [...companyNames];
        console.log(`[Main] Found ${companyNames.length} companies.`);

        if (companyNames.length === 0) {
             updateStatus(`Data parsed, but no valid entries.`, true);
             setControlsDisabled(true);
        } else {
            updateStatus(`Loaded ${companyNames.length} companies. Select one.`, false);
            renderCompanyList();
            setControlsDisabled(false); // Enable UI

            // Default Selection
            console.log("[Main] Applying default selection:", companyNames[0]);
            selectedCompany = companyNames[0];
            selectedCompanyNameH2.textContent = selectedCompany;
            applyPresetDateRange('MAX'); // Triggers chart render
            renderCompanyList(); // Update list highlight
        }
    } catch (error) {
        console.error('[Main] Load/Process Error:', error);
        let userMessage = `Error: ${error.message || 'Unknown error.'} `;
        // Simplified error advice
        updateStatus(userMessage + " Check console (F12) & file/server status.", true);
        setControlsDisabled(true);
    } finally {
        showLoading(false); // Hide spinner
    }
}

// --- Theme Handling ---
function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    currentTheme = theme;
    localStorage.setItem('theme', theme);
    themeToggleBtn.textContent = theme === 'light' ? '🌙' : '☀️';
    themeToggleBtn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    // Trigger re-render only if needed
    if (chartInstance && selectedCompany) {
        console.log(`[Theme] Re-rendering chart for new theme: ${theme}`);
        renderChart(); // Re-render completely to apply theme
    } else {
        console.log(`[Theme] Applied theme: ${theme}. No chart to update.`);
    }
}

function handleThemeToggle() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
}

// --- Utility Functions ---
function updateStatus(message, isError = false) {
    statusText.textContent = message;
    statusContainer.className = isError ? 'status-container error' : 'status-container';
}

function showLoading(show, message = '') {
    spinner.style.display = show ? 'inline-block' : 'none';
    if (show || message) { updateStatus(message || (show ? 'Loading...' : ''), false); }
}

function formatValueForChart(value) {
    if (value === null || value === undefined || isNaN(value)) return null;
    return value;
}

function setControlsDisabled(isDisabled) {
    searchBar.disabled = isDisabled;
    chartTypeSelect.disabled = isDisabled;
    presetButtons.forEach(button => button.disabled = isDisabled);
    resetZoomBtn.disabled = isDisabled;

    const candlestickOption = chartTypeSelect.querySelector('option[value="candlestick"]');
     if(candlestickOption && !Chart.registry?.controllers?.candlestick) {
        candlestickOption.disabled = true;
     }

    companyListUl.classList.toggle('disabled-list', isDisabled);
    if(!isDisabled) {
        // Enable reset zoom only if a chart instance exists AND zoom plugin is loaded
        resetZoomBtn.disabled = !(chartInstance && Chart.registry?.plugins?.zoom);
    }
}

// --- Reset Function ---
function resetAppState() {
    allData = {}; companyNames = []; filteredCompanyNames = []; selectedCompany = null;
    currentChartType = 'line'; chartTypeSelect.value = 'line';
    dateRange = { start: null, end: null }; activePreset = 'MAX';
    const candlestickOption = chartTypeSelect.querySelector('option[value="candlestick"]');
     if (candlestickOption) {
        candlestickOption.disabled = !Chart.registry?.controllers?.candlestick;
        candlestickOption.textContent = candlestickOption.disabled ? "Candlestick (Plugin Failed)" : "Candlestick (OHLC)";
     }
    companyListUl.innerHTML = ''; selectedCompanyNameH2.textContent = 'Select an item from the list'; searchBar.value = '';
    noDataMessageDiv.style.display = 'none'; chartContainer.style.display = 'none';
    if (chartInstance) { console.log("[ResetAppState] Destroying chart."); chartInstance.destroy(); chartInstance = null; }
    updateStatus("Initializing...");
    spinner.style.display = 'none';
    setControlsDisabled(true);
    updatePresetButtonStyles();
}

// --- Event Handlers ---
function handleSearch(event) {
    if (searchBar.disabled) return;
    const searchTerm = event.target.value.toLowerCase().trim();
    filteredCompanyNames = searchTerm ? companyNames.filter(name => name.toLowerCase().includes(searchTerm)) : [...companyNames];
    renderCompanyList();
}

function handleCompanySelect(event) {
    if (companyListUl.classList.contains('disabled-list')) return;
    const listItem = event.target.closest('li[data-company-name]');
    if (!listItem) return;
    const companyName = listItem.dataset.companyName;
    if (companyName && allData[companyName] && selectedCompany !== companyName) {
        selectedCompany = companyName;
        selectedCompanyNameH2.textContent = selectedCompany;
        applyPresetDateRange('MAX'); // Resets range and triggers renderChart
        renderCompanyList(); // Update list highlight only
    }
}

function handleChartTypeChange(event) {
    const newType = event.target.value;
    // Re-check if needed plugin is loaded *when selection is made*
    if (newType === 'candlestick' && !Chart.registry?.controllers?.candlestick) {
        alert("Candlestick chart cannot be displayed (plugin failed).");
        event.target.value = currentChartType; return;
    }
    currentChartType = newType;
    console.log('[ChartType] Changed to:', currentChartType);
    if (selectedCompany) renderChart();
}

function handlePresetButtonClick(event) {
    const button = event.target.closest('.preset-btn');
    if (!button || button.disabled || !selectedCompany) return;
    applyPresetDateRange(button.dataset.range);
}

function handleResetZoom() {
    if (chartInstance) chartInstance.resetZoom();
    else console.log("[Zoom] No chart instance.");
}

// --- Date Range Logic ---
function applyPresetDateRange(preset) {
    activePreset = preset; // Set active preset first
    if (!selectedCompany || !allData[selectedCompany]) { console.warn("Preset: No data"); dateRange={start:null, end:null}; updatePresetButtonStyles(); renderChart(); return; }
    const companyData = allData[selectedCompany];
    const validDataPoints = companyData.filter(item => item._parsedDate instanceof Date && !isNaN(item._parsedDate));
    if (validDataPoints.length === 0) { console.warn("Preset: No valid dates"); dateRange={start:null, end:null}; updatePresetButtonStyles(); renderChart(); return; }

    const latestDate = validDataPoints[validDataPoints.length - 1]._parsedDate;
    let startDate = null;
    const endDate = new Date(Date.UTC(latestDate.getUTCFullYear(), latestDate.getUTCMonth(), latestDate.getUTCDate(), 23, 59, 59, 999));

    if (typeof dateFns === 'undefined') { console.error("date-fns needed!"); updateStatus("Error: Date library missing.", true); return; }
    try {
        switch(preset) {
            case '1M': startDate = dateFns.subMonths(endDate, 1); break;
            case '6M': startDate = dateFns.subMonths(endDate, 6); break;
            case 'YTD': startDate = dateFns.startOfYear(endDate); break;
            case '1Y': startDate = dateFns.subYears(endDate, 1); break;
            case '5Y': startDate = dateFns.subYears(endDate, 5); break;
            default: startDate = null; break; // MAX
        }
        if (startDate) startDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate(), 0, 0, 0, 0));
        dateRange = { start: startDate, end: latestDate }; // Update state
        console.log(`[Presets] Applied range '${preset}':`, dateRange.start, 'to', dateRange.end);
        updatePresetButtonStyles();
        renderChart(); // Re-render chart with the new range
    } catch (e) { console.error("Error calculating date range:", e); updateStatus("Error calculating date range.", true); }
}

function updatePresetButtonStyles() {
    presetButtons.forEach(button => button.classList.toggle('active', button.dataset.range === activePreset));
    console.log("[Presets] Updated button styles, active:", activePreset);
}


// --- Rendering Functions ---
function renderCompanyList() {
    companyListUl.innerHTML = '';
    if (filteredCompanyNames.length === 0) { const li = document.createElement('li'); li.textContent = searchBar.disabled ? 'Initializing...' : (companyNames.length === 0 ? 'No data.' : (searchBar.value ? 'No matches.' : 'No companies.')); li.classList.add('message'); companyListUl.appendChild(li); return; }
    filteredCompanyNames.forEach(name => { const li = document.createElement('li'); li.textContent = name; li.dataset.companyName = name; li.title = name; if (name === selectedCompany) li.classList.add('selected'); companyListUl.appendChild(li); });
}

// --- Updated renderChart Function (WITH Rendering Lock & Fixed Logic) ---
function renderChart() {
    // <<< Check Rendering Lock >>>
    if (isRenderingChart) { console.warn("[RenderChart] Render attempt ignored, already rendering."); return; }
    isRenderingChart = true; // <<< Set Lock >>>
    console.log(`[RenderChart] LOCK ACQUIRED. Type:${currentChartType}, Comp:${selectedCompany}`);

    noDataMessageDiv.style.display = 'none'; chartContainer.style.display = 'none'; noDataMessageDiv.classList.remove('error');
    resetZoomBtn.disabled = true;

    // --- Step 1: Destroy Existing Chart ---
    if (chartInstance) {
        console.log(`[RenderChart] Attempting destroy ID: ${chartInstance.id}`);
        try { chartInstance.destroy(); } catch (e) { console.error("Error destroying chart:", e); }
        chartInstance = null; // Set to null immediately
    } else { console.log("[RenderChart] No existing chart instance to destroy."); }

    // --- Step 2: Schedule Creation ---
    setTimeout(() => {
        try { // Wrap ALL logic below destroy in try...finally for lock release
            console.log("[RenderChart-Timeout] Starting chart creation...");

            // Core Checks
            if (typeof Chart === 'undefined' ) { throw new Error("Chart library not loaded."); }
            if (currentChartType === 'candlestick' && !Chart.registry?.controllers?.candlestick) { throw new Error("Candlestick plugin missing."); }
            if (!selectedCompany || !allData[selectedCompany]) { throw new Error("No company selected or data missing."); }
            const companyData = allData[selectedCompany];
            if (companyData.length === 0) { throw new Error(`No data points for "${selectedCompany}".`); }

            // Filter Data
            const filteredData = companyData.filter(item => {
                if (!item._parsedDate || isNaN(item._parsedDate)) return false;
                const itemTime = item._parsedDate.getTime();
                const startTime = dateRange.start ? dateRange.start.getTime() : -Infinity;
                const endTime = dateRange.end ? new Date(Date.UTC(dateRange.end.getUTCFullYear(), dateRange.end.getUTCMonth(), dateRange.end.getUTCDate(), 23, 59, 59, 999)).getTime() : Infinity;
                return itemTime >= startTime && itemTime <= endTime;
            });
            if (filteredData.length === 0) { throw new Error(`No data for "${selectedCompany}" in range (${activePreset}).`); }
            console.log(`[RenderChart-Timeout] Filtered points: ${filteredData.length}`);

            // Prepare Data & Options
            const themeDatasetColors = CHART_DATASET_COLORS[currentTheme] || CHART_DATASET_COLORS.light;
            let datasetsToShow = [];
            let chartSpecificOptions = { parsing: false };
            let tooltipCallbacks = { label: function(context) { let label = context.dataset.label || ''; if(label) label+=': '; label += context.parsed?.y?.toFixed(2) ?? 'N/A'; return label; } };
            let chartTypeToUse = currentChartType; // Set type explicitly

             try { // Wrap data formatting
                if (currentChartType === 'line') {
                    const formatData = (dataKey) => filteredData.map(item => ({ x: item._parsedDate.getTime(), y: formatValueForChart(item[dataKey]) }));
                    datasetsToShow = [
                         { label: 'Close', data: formatData('close'), borderColor: themeDatasetColors.Close || '#007bff', tension: 0.1, borderWidth: 2, pointRadius: 1, pointHoverRadius: 4, spanGaps: false },
                         { label: 'Open', data: formatData('open'), borderColor: themeDatasetColors.Open || '#ffc107', tension: 0.1, borderWidth: 1.5, hidden: false, pointRadius: 1, pointHoverRadius: 4, spanGaps: false },
                         { label: 'High', data: formatData('high'), borderColor: themeDatasetColors.High || '#28a745', tension: 0.1, borderWidth: 1.5, hidden: false, pointRadius: 1, pointHoverRadius: 4, spanGaps: false },
                         { label: 'Low', data: formatData('low'), borderColor: themeDatasetColors.Low || '#dc3545', tension: 0.1, borderWidth: 1.5, hidden: false, pointRadius: 1, pointHoverRadius: 4, spanGaps: false }
                    ];
                } else if (currentChartType === 'candlestick') {
                     const candlestickData = filteredData.map(item => ({ x: item._parsedDate.getTime(), o: formatValueForChart(item.open), h: formatValueForChart(item.high), l: formatValueForChart(item.low), c: formatValueForChart(item.close) })).filter(p => p.x && p.o !== null && p.h !== null && p.l !== null && p.c !== null);
                     if (candlestickData.length === 0) { throw new Error("No complete OHLC points for candlestick"); }
                     datasetsToShow = [{
                         label: selectedCompany, data: candlestickData,
                         // Explicit colors set during *creation* and theme update
                         color: { up: themeDatasetColors.CandleUp, down: themeDatasetColors.CandleDown, unchanged: '#999999'}
                     }];
                     tooltipCallbacks = { label: function(context) { if (!context.raw) return ''; const o=context.raw.o?.toFixed(2),h=context.raw.h?.toFixed(2),l=context.raw.l?.toFixed(2),c=context.raw.c?.toFixed(2); return `O:${o} H:${h} L:${l} C:${c}`; } };
                     chartTypeToUse = 'candlestick'; // Confirm type for new Chart
                 } else if (currentChartType === 'bar') {
                    const formatData = (dataKey) => filteredData.map(item => ({ x: item._parsedDate.getTime(), y: formatValueForChart(item[dataKey]) })).filter(p => p.y !== null);
                    const closeData = formatData('close');
                     if (closeData.length === 0) { throw new Error("No valid Close data for bar chart"); }
                    datasetsToShow = [ { label: 'Close', data: closeData, backgroundColor: themeDatasetColors.Close || '#007bff' } ];
                    chartTypeToUse = 'bar';
                 }
            } catch (e) { throw new Error(`Data preparation failed: ${e.message}`); }


            if (datasetsToShow.length === 0 || datasetsToShow.every(ds => !ds.data || ds.data.length === 0)) { throw new Error("No plottable data found."); }

            const chartData = { datasets: datasetsToShow };
            const chartOptions = { // FULL options needed now
                responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: currentChartType === 'line', position: 'top', labels: { usePointStyle: true, padding: 15 } },
                    title: { display: false },
                    tooltip: { mode: 'index', intersect: false, callbacks: tooltipCallbacks },
                    zoom: { zoom: { wheel: { enabled: true, speed: 0.1 }, pinch: { enabled: true }, mode: 'x' }, pan: { enabled: true, mode: 'x', threshold: 5 }, limits: { x: { min: 'original', max: 'original' } } }
                },
                scales: {
                    x: { type: 'time', time: { unit: 'day', displayFormats: { day: 'dd-MM-yyyy' }, tooltipFormat: 'dd-MM-yyyy HH:mm' }, title: { display: true, text: 'Date' }, ticks: { source: 'auto', autoSkip: true }, grid: {}, border: {} },
                    y: { title: { display: true, text: 'Value' }, beginAtZero: false, grace: '5%', ticks: {}, grid: {}, border: {} }
                },
                ...chartSpecificOptions
            };

            applyThemeColorsToOptions(chartOptions, currentTheme); // Apply AXIS/GRID theme

            // --- Create New Chart Instance ---
            console.log(`[RenderChart-Timeout] Creating new ${chartTypeToUse} chart instance...`);
            chartContainer.style.display = 'block';
            const ctx = chartCanvas.getContext('2d');
            chartInstance = new Chart(ctx, { type: chartTypeToUse, data: chartData, options: chartOptions });
            console.log("[RenderChart-Timeout] New chart instance created ID:", chartInstance?.id);

            updateChartTheme(chartInstance, currentTheme, false); // Apply DATASET colors (don't re-apply axis)
            resetZoomBtn.disabled = !(Chart.registry?.plugins?.zoom);

        } catch (error) { // Catch errors from checks or creation inside timeout
            console.error("[RenderChart-Timeout] Error:", error);
            noDataMessageDiv.textContent = `Error rendering chart: ${error.message}`;
            noDataMessageDiv.classList.add('error'); noDataMessageDiv.style.display = 'block';
            chartContainer.style.display = 'none';
            if (chartInstance) { try { chartInstance.destroy(); } catch(e){} chartInstance = null; } // Cleanup partial
            resetZoomBtn.disabled = true;
        } finally {
            // <<< Release the lock AFTER timeout logic >>>
            isRenderingChart = false;
            console.log("[RenderChart-Timeout] LOCK RELEASED.");
        }
    }, 10); // Keep minimal delay

} // End renderChart


// --- Helper to Apply Theme Colors to Chart Options (Axis/Grid Only) ---
function applyThemeColorsToOptions(options, theme) {
    const isDark = theme === 'dark';
    const defaultColors = isDark ? DEFAULT_CHART_COLORS.dark : DEFAULT_CHART_COLORS.light;
    const gridColor = defaultColors.grid; const tickColor = defaultColors.tick;
    const labelColor = defaultColors.label; const borderColor = defaultColors.border;

    // Ensure structure exists safely
    options.scales = options.scales || {}; options.scales.x = options.scales.x || {}; options.scales.y = options.scales.y || {};
    options.scales.x.grid = options.scales.x.grid || {}; options.scales.x.ticks = options.scales.x.ticks || {}; options.scales.x.title = options.scales.x.title || {}; options.scales.x.border = options.scales.x.border || {};
    options.scales.y.grid = options.scales.y.grid || {}; options.scales.y.ticks = options.scales.y.ticks || {}; options.scales.y.title = options.scales.y.title || {}; options.scales.y.border = options.scales.y.border || {};
    options.plugins = options.plugins || {}; options.plugins.legend = options.plugins.legend || {}; options.plugins.legend.labels = options.plugins.legend.labels || {};

    // Apply colors
    options.scales.x.grid.color = gridColor; options.scales.x.ticks.color = tickColor; options.scales.x.title.color = labelColor; options.scales.x.border.color = borderColor;
    options.scales.y.grid.color = gridColor; options.scales.y.ticks.color = tickColor; options.scales.y.title.color = labelColor; options.scales.y.border.color = borderColor;
    options.plugins.legend.labels.color = labelColor;

    console.log(`[ChartTheme] Applied AXIS/GRID defaults (${theme}) to options.`);
}

// --- Helper to Update Existing Chart Theme (Axis/Grid AND Datasets) ---
function updateChartTheme(chart, theme, updateAxes = true) {
    if (!chart || !chart.options || !chart.data) { console.warn("UpdateChartTheme: Invalid chart object"); return; }
    console.log(`[ChartTheme] Updating chart ${chart.id} theme: ${theme}, updateAxes: ${updateAxes}`);

    // 1. Optionally Update Axis/Grid colors
    if (updateAxes) {
        applyThemeColorsToOptions(chart.options, theme);
    }

    // 2. Update Dataset colors
    const newThemeDatasetColors = CHART_DATASET_COLORS[theme] || CHART_DATASET_COLORS.light;
    chart.data.datasets.forEach(dataset => {
        const label = dataset.label; const chartType = chart.config.type;
        if (chartType === 'candlestick') {
             dataset.color = dataset.color || {};
             dataset.color.up = newThemeDatasetColors.CandleUp;
             dataset.color.down = newThemeDatasetColors.CandleDown;
             dataset.color.unchanged = '#999999';
             console.log(`[ChartTheme] Updated CANDLESTICK colors`);
        } else if (newThemeDatasetColors[label]) {
            if (chartType === 'bar') dataset.backgroundColor = newThemeDatasetColors[label];
            else if (chartType === 'line') dataset.borderColor = newThemeDatasetColors[label];
            console.log(`[ChartTheme] Updated ${chartType.toUpperCase()} dataset '${label}' color`);
        } else if (label !== selectedCompany) { // Avoid warning for candlestick main label
             console.warn(`[ChartTheme] No color for dataset: '${label}' theme '${theme}' type '${chartType}'`);
        }
    });

    // 3. Apply the changes
    try { chart.update(); console.log(`[ChartTheme] Chart ${chart.id} update finished.`); }
    catch (updateError) { console.error(`[ChartTheme] Error during chart.update():`, updateError); noDataMessageDiv.textContent = `Error updating theme: ${updateError.message}`; noDataMessageDiv.classList.add('error'); noDataMessageDiv.style.display = 'block'; }
}