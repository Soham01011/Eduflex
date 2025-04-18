class LeaderboardManager {
    constructor() {
        this.data = null;
        this.initializeFilters();
        this.fetchData();
    }

    async fetchData() {
        try {
            const response = await fetch('/leaderboard/api');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            this.data = await response.json();
            this.renderTables();
            this.setupFilterListeners();
        } catch (error) {
            console.error('Error fetching leaderboard data:', error);
        }
    }

    initializeFilters() {
        // Create filter dropdowns for each table
        const tables = ['academic', 'extracurricular', 'experience'];
        tables.forEach(type => {
            const filterId = `${type}-filter`;
            const filterContainer = document.getElementById(`${type}-table-container`);
            if (filterContainer) {
                const filterSelect = document.createElement('select');
                filterSelect.id = filterId;
                filterSelect.className = 'mb-4 p-2 border rounded';
                filterContainer.prepend(filterSelect);
            }
        });
    }

    getSubtypesByMainType(mainType) {
        // Get unique subtypes from pointsData for the given type
        const subtypes = new Set(
            this.data.pointsData
                .filter(point => point.post_type.toLowerCase() === mainType.toLowerCase())
                .map(point => point.post_subtype)
        );
        return Array.from(subtypes);
    }

    calculatePoints(username, type, subtype = null) {
        return this.data.pointsData
            .filter(point => {
                if (subtype) {
                    return point.username === username && 
                           point.post_type.toLowerCase() === type.toLowerCase() && 
                           point.post_subtype === subtype;
                }
                return point.username === username && 
                       point.post_type.toLowerCase() === type.toLowerCase();
            })
            .reduce((sum, point) => sum + point.points, 0);
    }

    createTableRow(user, type, subtype = null) {
        const points = this.calculatePoints(user.username, type, subtype);
        if (points === 0) return null;

        return `
            <tr class="text-gray-700 dark:text-gray-400">
                <td class="px-4 py-3">
                    <div class="flex items-center text-sm">
                        <div>
                            <p class="font-semibold">${user.firstname} ${user.lastname}</p>
                            <p class="text-xs text-gray-600 dark:text-gray-400">${user.username}</p>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-3 text-sm">${user.department}</td>
                <td class="px-4 py-3 text-sm">${points}</td>
            </tr>
        `;
    }

    renderTable(type, subtype = null) {
        const tableBody = document.querySelector(`#${type}-table tbody`);
        if (!tableBody) return;

        let rows = '';
        Object.values(this.data.users).forEach(user => {
            const row = this.createTableRow(user, type, subtype);
            if (row) rows += row;
        });

        tableBody.innerHTML = rows || '<tr><td colspan="3" class="text-center py-4">No data available</td></tr>';
    }

    renderTables() {
        // Handle both 'Extracurricular' and 'extracurricular' in data
        const types = ['academic', 'extracurricular', 'experience'];
        
        types.forEach(type => {
            // Update filter options
            const filter = document.getElementById(`${type}-filter`);
            if (filter) {
                const subtypes = this.getSubtypesByMainType(type);
                filter.innerHTML = `
                    <option value="">All ${type}</option>
                    ${subtypes.map(subtype => `<option value="${subtype}">${subtype}</option>`).join('')}
                `;
            }
            // Render initial table
            this.renderTable(type);
        });
    }

    setupFilterListeners() {
        ['academic', 'extracurricular', 'experience'].forEach(type => {
            const filter = document.getElementById(`${type}-filter`);
            if (filter) {
                filter.addEventListener('change', (e) => {
                    const selectedSubtype = e.target.value;
                    this.renderTable(type, selectedSubtype);
                });
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LeaderboardManager();
});