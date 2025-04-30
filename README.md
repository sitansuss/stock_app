Stock Data Viewer

A browser-based application to interactively view and visualize time-series data (like stock prices or index values) loaded from a local CSV file. It utilizes Chart.js for plotting and provides features for data exploration.

## Features

*   **Automatic Data Loading:** Loads data from a predefined `dump.csv` file located in the same directory on page load.
*   **Interactive Charting:** Displays data using Chart.js with support for:
    *   **Line Chart:** Shows Open, High, Low, and Close values as separate lines. Legend allows toggling visibility.
    *   **Bar Chart:** Shows the Close price as bars.
    *   *(Candlestick functionality was attempted but removed due to plugin loading issues)*
*   **Zoom & Pan:** Allows zooming (mouse wheel/pinch) and panning (click & drag) on the chart's time axis using `chartjs-plugin-zoom`. Includes a "Reset Zoom" button.
*   **Company/Index List:** Displays a searchable list of unique indices or company names found in the CSV data.
*   **Search Filter:** Filters the company/index list based on user input.
*   **Preset Date Ranges:** Buttons (1M, 6M, YTD, 1Y, 5Y, Max) to quickly filter the chart's displayed time range based on the latest data point for the selected item.
*   **Theme Toggle:** Switch between Light and Dark themes.
*   **Theme Persistence:** Remembers the user's theme preference using `localStorage`.
*   **Loading Indicator:** Shows a spinner while fetching and parsing data.
*   **Error Handling:** Basic error messages for file loading, parsing, or chart rendering issues.
*   **Responsive Design:** Adapts layout for different screen sizes.

## Technologies Used

*   **HTML5**
*   **CSS3:** (Utilizes CSS Custom Properties/Variables for theming)
*   **JavaScript (ES Modules):** Core application logic.
*   **[Chart.js](https://www.chartjs.org/):** For creating charts.
*   **[PapaParse](https://www.papaparse.com/):** For parsing the CSV data.
*   **[date-fns](https://date-fns.org/):** For reliable date calculations (used by preset date range buttons).
*   **[chartjs-adapter-date-fns](https://github.com/chartjs/chartjs-adapter-date-fns):** Integrates date-fns with Chart.js for the time scale.
*   **[chartjs-plugin-zoom](https://github.com/chartjs/chartjs-plugin-zoom):** Enables chart zooming and panning.
*   **[Hammer.js](https://hammerjs.github.io/):** Dependency for touch gesture support in chartjs-plugin-zoom.

## Setup

1.  **Clone or Download:** Get all project files (`index.html`, `style.css`, `main.js`, `csvParser.js`).
2.  **Place Files:** Ensure all four files are located in the **same directory**.
3.  **Prepare Data:** Create your CSV data file and name it exactly `dump.csv`. Place this file in the **same directory** as the other files. (See **Data Format** section below).
4.  **Run a Local Web Server:** This application uses `fetch` to load the local CSV and ES Modules (`import`/`export`), which **requires a web server** due to browser security policies (CORS). Opening `index.html` directly via `file:///` will likely fail.
    *   **Option A (Node.js):** If you have Node.js installed, open your terminal/command prompt, navigate (`cd`) into the project directory, and run:
        ```bash
        npx serve
        ```
        (If `serve` isn't installed, run `npm install -g serve` first).
    *   **Option B (Python 3):** Open your terminal/command prompt, navigate (`cd`) into the project directory, and run:
        ```bash
        python -m http.server
        ```
    *   **Option C (Other):** Use any other simple static file server (like VS Code's Live Server extension).
5.  **Access in Browser:** Open your web browser and navigate to the local address provided by the server (usually `http://localhost:3000`, `http://localhost:8000`, or similar).

## Usage

1.  **Loading:** The application will automatically attempt to load and parse `dump.csv` when the page opens. A loading indicator and status message will be shown.
2.  **Default View:** If data loads successfully, the list on the left will populate, and the chart for the first company/index in the list will be displayed, showing the maximum available date range ('Max' preset).
3.  **Select Data:** Click on any name in the "Companies / Indices" list on the left to view its corresponding chart.
4.  **Search:** Type in the search bar above the list to filter the company/index names.
5.  **Change Chart Type:** Use the "Chart Type" dropdown above the chart to switch between "Line (OHLC)" and "Bar (Close Price)".
6.  **Change Date Range:** Click the preset date range buttons (1M, 6M, YTD, 1Y, 5Y, Max) to filter the time period shown on the chart.
7.  **Zoom/Pan:**
    *   **Zoom:** Use your mouse wheel while hovering over the chart area, or use a pinch gesture on touch devices.
    *   **Pan:** Click and drag horizontally on the chart area.
    *   **Reset Zoom:** Click the "Reset Zoom" button above the chart to return the time axis to the currently selected preset range.
8.  **Toggle Theme:** Click the Moon (🌙) / Sun (☀️) icon in the top right area to switch between light and dark themes. Your preference is saved locally.

## Data Format (`dump.csv`)

The application expects the `dump.csv` file to adhere to the following:

*   **Format:** Comma-Separated Values (CSV).
*   **Header Row:** The **first row must be a header row** containing column names.
*   **Required Columns (Case-insensitive header names, processed as lowercase_snake_case):**
    *   `index_name` (or similar like `company_name`): The identifier for the stock/index.
    *   `index_date` (or similar like `date`): The date for the data point. Acceptable formats currently include `YYYY-MM-DD` and `DD-MM-YYYY`.
    *   `closing_index_value` (or similar like `close`, `value`): The primary value to plot (required for Bar chart and Close line).
*   **Recommended Columns (for full OHLC features):**
    *   `open_index_value` (or `open`)
    *   `high_index_value` (or `high`)
    *   `low_index_value` (or `low`)
*   **Numeric Values:** Open, High, Low, Close columns should contain standard numerical values (e.g., `12345.67`) or values that can be parsed as floats. Empty cells, "-", or "NaN" will generally be treated as missing data (`null`) for plotting.
*   **Data Order:** While the parser sorts data by date for each company, having the CSV pre-sorted by date within each company block can sometimes improve parsing performance.

## Potential Future Improvements

*   Re-investigate and fix `chartjs-chart-financial` loading to reliably enable Candlestick charts.
*   Add more chart types (e.g., Area chart for Close price).
*   Display more detailed statistics for the selected range (e.g., high, low, change %, volume).
*   Implement a "Data Point Panel" showing exact OHLC values on hover/click.
*   Add functionality to export the currently viewed chart data or image.
*   Option to upload a CSV file instead of relying solely on `dump.csv`.
*   More granular loading progress indicators.
*   Unit and integration tests.
*   Code refactoring and documentation improvements.

```1Y, 5Y, Max).
*   **Zoom & Pan:** Allows zooming (mouse wheel/pinch) and panning (click-drag) on the time (X) axis of the chart using `chartjs-plugin-zoom`.
*   **Reset Zoom:** A dedicated button to reset the chart's zoom/pan level.
*   **Theme Toggle:** Switch between Light and Dark modes. User preference is saved in `localStorage`.
*   **Loading Indicator:** Displays a spinner while fetching and parsing data.
*   **Responsive Design:** Adapts layout for different screen sizes.

## Technology Stack

*   HTML5
*   CSS3 (with CSS Variables for theming)
*   JavaScript (ES Modules)
*   [PapaParse](https://www.papaparse.com/): For robust CSV parsing in the browser.
*   [Chart.js](https://www.chartjs.org/): For creating interactive charts.
*   [date-fns](https://date-fns.org/): For reliable date manipulation (used by presets).
*   [chartjs-adapter-date-fns](https://github.com/chartjs/chartjs-adapter-date-fns): Chart.js adapter for using date-fns with time scales.
*   [chartjs-chart-financial](https://github.com/chartjs/chartjs-chart-financial): Chart.js plugin for financial charts like Candlestick.
*   [Hammer.js](https://hammerjs.github.io/): Dependency for touch gesture support in `chartjs-plugin-zoom`.
*   [chartjs-plugin-zoom](https://github.com/chartjs/chartjs-plugin-zoom): Chart.js plugin for zooming and panning functionality.

## Setup and Running

1.  **Prerequisites:**
    *   A modern web browser (Chrome, Firefox, Edge, Safari).
    *   A simple **local web server**. This is **required** because browsers restrict loading local files (`file:///`) using `fetch` (which loads `dump.csv`) and often have issues with ES Modules loaded directly from the filesystem.

2.  **Get the Code:**
    *   Clone the repository or download the project files (`index.html`, `style.css`, `main.js`, `csvParser.js`).

3.  **Prepare Data:**
    *   Place your CSV data file named **`dump.csv`** in the **same root directory** as the HTML/CSS/JS files.
    *   The CSV file **must** have a header row. The parser expects the following header names (case-insensitive, spaces replaced by underscores internally):
        *   `index_name` (or `company_name`, etc. - the identifier)
        *   `index_date` (Expected formats: `YYYY-MM-DD` or `DD-MM-YYYY`)
        *   `open_index_value`
        *   `high_index_value`
        *   `low_index_value`
        *   `closing_index_value`
        *   Other columns are ignored by the core chart functionality.

4.  **Run a Local Server:**
    *   Open your terminal or command prompt.
    *   Navigate (`cd`) into the project directory where your files are located.
    *   Start a local server. Here are two common options:
        *   **Using Node.js/npx:** If you have Node.js installed, run:
            ```bash
            npx serve
            ```
            (If `serve` isn't installed, you might need `npm install -g serve` first, or just use `npx` which downloads it temporarily).
        *   **Using Python 3:**
            ```bash
            python -m http.server
            ```
        *   Other tools like VS Code's "Live Server" extension also work.
    *   The server will usually output a URL like `http://localhost:8000` or `http://localhost:3000` (the port might vary).

5.  **Access the Application:**
    *   Open your web browser and navigate to the URL provided by the local server (e.g., `http://localhost:8000`).

## Usage

1.  **Automatic Loading:** The application will automatically attempt to load and parse `dump.csv` when the page loads. The status message will indicate progress.
2.  **Select Data:** Once loaded, the sidebar will populate with unique company/index names found in the `index_name` column.
    *   Use the **Search bar** to filter the list.
    *   Click on an item in the list to display its chart data. The first item is selected by default.
3.  **Interact with Chart:**
    *   **Change Chart Type:** Use the dropdown selector above the chart to switch between "Line", "Candlestick", and "Bar" views.
    *   **Change Date Range:** Click the preset buttons (1M, 6M, etc.) to quickly filter the displayed time period. The "Max" button shows all available data for the selection.
    *   **Zoom:** Use your mouse wheel over the chart area or pinch gestures on touch devices to zoom in/out on the time axis.
    *   **Pan:** Click and drag horizontally on the chart area to pan across the timeline.
    *   **Reset Zoom:** Click the "Reset Zoom" button to return the chart to the default zoom level determined by the selected date range preset.
    *   **Tooltips:** Hover over data points on the chart to see specific values.
    *   **Toggle Lines (Line Chart):** Click on items in the legend ('Close', 'Open', 'High', 'Low') above the line chart to hide/show individual lines.
4.  **Toggle Theme:** Click the Moon/Sun icon (🌓/☀️) in the header area to switch between light and dark themes. Your preference will be saved for subsequent visits.
