import { createOrbitGraph } from "../../packages/three/src";
import type { GraphData } from "../../packages/core/src";

import "./style.css";

const data: GraphData = {
    nodes: [
        {
            id: "manuel",
            label: "Manuel",
            type: "person",
            color: "#22d3ee",
            size: 1.5,
            data: {
                age: 26,
                location: "Monterrey, Mexico",
                skills: ["Java", "FastAPI", "TypeScript", "Unity"],
                active: true,
                social: {
                    github: "Manuel1471",
                    linkedin: null
                }
            }
        },
        {
            id: "monetra",
            label: "Monetra",
            type: "project",
            color: "#a855f7",
            size: 1.3,
            data: {
                status: "in-development",
                platforms: ["Android"],
                createdAt: "2026-06-27",
                description: "Personal finance and subscription tracking app"
            }
        },
        {
            id: "api",
            label: "API",
            type: "service",
            color: "#3b82f6",
            data: {
                framework: "FastAPI",
                language: "Python",
                status: "active",
                url: "https://monetrabackend.onrender.com"
            }
        },
        {
            id: "postgres",
            label: "PostgreSQL",
            type: "database",
            color: "#f472b6",
            data: {
                engine: "PostgreSQL",
                provider: "Render",
                environment: "development",
                tables: ["users", "expenses", "subscriptions", "reminders"]
            }
        },
        {
            id: "auth",
            label: "Authentication",
            type: "service",
            color: "#facc15",
            data: {
                methods: ["Email and password", "Google OAuth"],
                tokenType: "JWT",
                refreshTokens: true
            }
        },
        {
            id: "mobile",
            label: "Android App",
            type: "app",
            color: "#34d399",
            data: {
                platform: "Android",
                language: "Kotlin",
                minSdk: 31,
                status: "in-development"
            }
        },
        {
            id: "events",
            label: "Events",
            type: "service",
            color: "#fb7185",
            data: {
                purpose: "Stores and processes application events",
                realtime: false,
                eventTypes: ["expense-created", "subscription-reminder"]
            }
        }
    ],

    links: [
        {
            id: "manuel-owns-monetra",
            source: "manuel",
            target: "monetra",
            type: "owns",
            weight: 1,
            data: {
                role: "founder",
                ownershipPercentage: 100,
                since: "2026-06-27"
            }
        },
        {
            id: "monetra-uses-api",
            source: "monetra",
            target: "api",
            type: "uses",
            weight: 0.95,
            data: {
                protocol: "HTTPS",
                purpose: "Business logic and data access"
            }
        },
        {
            id: "api-uses-postgres",
            source: "api",
            target: "postgres",
            type: "stores-data-in",
            weight: 0.9,
            data: {
                connectionType: "PostgreSQL connection pool",
                containsSensitiveData: true
            }
        },
        {
            id: "api-uses-auth",
            source: "api",
            target: "auth",
            type: "uses",
            weight: 0.8,
            data: {
                purpose: "User login and token validation"
            }
        },
        {
            id: "monetra-has-mobile-app",
            source: "monetra",
            target: "mobile",
            type: "runs-on",
            weight: 1,
            data: {
                primaryClient: true,
                releaseStatus: "development"
            }
        },
        {
            id: "api-emits-events",
            source: "api",
            target: "events",
            type: "emits",
            weight: 0.6,
            data: {
                eventFormat: "JSON",
                examples: ["expense-created", "user-registered"]
            }
        },
        {
            id: "auth-stores-postgres",
            source: "auth",
            target: "postgres",
            type: "stores-data-in",
            weight: 0.7,
            data: {
                stores: ["users", "refresh_tokens"],
                encryptedFields: ["password_hash"]
            }
        }
    ]
};

const detailsPanel = document.querySelector<HTMLElement>("#details-panel");
const detailTitle = document.querySelector<HTMLElement>("#detail-title");
const detailSubtitle = document.querySelector<HTMLElement>("#detail-subtitle");
const detailData = document.querySelector<HTMLElement>("#detail-data");
const tooltip = document.querySelector<HTMLElement>("#tooltip");

const container = document.querySelector<HTMLElement>("#graph");

if (!container) {
    throw new Error("Graph container was not found.");
}

const nodeCount = document.querySelector<HTMLElement>("#node-count");
const linkCount = document.querySelector<HTMLElement>("#link-count");

const searchInput = document.querySelector<HTMLInputElement>("#graph-search");

const clearFiltersButton =
    document.querySelector<HTMLButtonElement>("#clear-filters");

const resetCameraButton =
    document.querySelector<HTMLButtonElement>("#reset-camera");

const typeButtons =
    document.querySelectorAll<HTMLButtonElement>("[data-type]");

const weightSlider =
    document.querySelector<HTMLInputElement>("#weight-slider");

const weightValue =
    document.querySelector<HTMLElement>("#weight-value");

const graph = createOrbitGraph(container, {
    backgroundColor: "#050816",
    linkColor: "#6366f1",
    linkOpacity: 0.55,

    onVisibleDataChange: ({ nodes, links }) => {
        if (nodeCount) {
            nodeCount.textContent = String(nodes.length);
        }

        if (linkCount) {
            linkCount.textContent = String(links.length);
        }
    },

    onNodeHover: ({ node, nativeEvent }) => {
        if (!tooltip) {
            return;
        }

        if (!node) {
            tooltip.style.display = "none";
            return;
        }

        tooltip.textContent =
            `${node.label ?? node.id} · ${node.type ?? "node"}`;

        tooltip.style.display = "block";
        tooltip.style.left = `${nativeEvent.clientX + 14}px`;
        tooltip.style.top = `${nativeEvent.clientY + 14}px`;
    },

    onLinkHover: ({ link, nativeEvent }) => {
        if (!tooltip || !link) {
            return;
        }

        tooltip.textContent =
            `${link.type ?? "related"} · ${link.source} → ${link.target}`;

        tooltip.style.display = "block";
        tooltip.style.left = `${nativeEvent.clientX + 14}px`;
        tooltip.style.top = `${nativeEvent.clientY + 14}px`;
    },

    onSelectionChange: (selection) => {
        if (!detailsPanel || !detailTitle || !detailSubtitle || !detailData) {
            return;
        }

        if (!selection) {
            detailsPanel.classList.add("is-empty");
            detailTitle.textContent = "Selecciona algo";

            detailSubtitle.textContent =
                "Haz clic en un nodo o una relación para ver su información.";

            detailData.textContent = "";
            return;
        }

        detailsPanel.classList.remove("is-empty");

        if (selection.kind === "node") {
            const { node } = selection;

            detailTitle.textContent = node.label ?? node.id;
            detailSubtitle.textContent = `Nodo · ${node.type ?? "sin tipo"}`;
            detailData.textContent = JSON.stringify(node.data ?? {}, null, 2);
            return;
        }

        const { link } = selection;

        detailTitle.textContent = link.type ?? "Relación";
        detailSubtitle.textContent = `${link.source} → ${link.target}`;

        detailData.textContent = JSON.stringify(
            {
                weight: link.weight ?? null,
                data: link.data ?? {},
            },
            null,
            2,
        );
    },
});

graph.setData(data);
graph.resetCamera();

searchInput?.addEventListener("input", () => {
    graph.search(searchInput.value);
});

clearFiltersButton?.addEventListener("click", () => {
    graph.clearFilters();

    if (searchInput) {
        searchInput.value = "";
    }

    if (weightSlider) {
        weightSlider.value = "0";
    }

    if (weightValue) {
        weightValue.textContent = "0%";
    }

    typeButtons.forEach((button) => {
        button.classList.remove("is-active");
    });
});

resetCameraButton?.addEventListener("click", () => {
    graph.resetCamera();
});

typeButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const type = button.dataset.type;

        if (!type) {
            return;
        }

        button.classList.toggle("is-active");
        graph.toggleTypeFilter(type);
    });
});

weightSlider?.addEventListener("input", () => {
    const weight = Number(weightSlider.value) / 100;

    graph.setMinimumLinkWeight(weight);

    if (weightValue) {
        weightValue.textContent = `${weightSlider.value}%`;
    }
});