// Navigation component for User Manager Test App
export function createNavigation(currentPage = "") {
  const nav = document.createElement("nav");
  nav.className = "app-navigation";

  const pages = [
    {name: "Login", path: "index.html", icon: "🔐"},
    {name: "Dashboard", path: "dashboard.html", icon: "🏠"},
    {name: "Verify Email", path: "verify.html", icon: "✉️"},
    {
      name: "Test Suite",
      path: "#",
      icon: "🧪",
      dropdown: [
        {name: "Event Emitter", path: "test-event-emitter.html"},
        {name: "User Manager", path: "test-user-manager.html"},
        {name: "Error Handling", path: "test-error-handling.html"},
        {name: "Email Auth", path: "test-emailauth.html"},
        {name: "Session Manager", path: "test-session.html"},
        {name: "Enhanced Manager", path: "test-enhanced-usermanager.html"},
      ],
    },
  ];

  nav.innerHTML = `
    <div class="nav-container">
      <div class="nav-brand">
        <span class="nav-logo">👤</span>
        <span class="nav-title">User Manager</span>
      </div>
      <ul class="nav-menu">
        ${pages
          .map((page) => {
            const isActive = currentPage === page.path || (page.dropdown && page.dropdown.some((sub) => currentPage === sub.path));

            if (page.dropdown) {
              return `
              <li class="nav-item dropdown ${isActive ? "active" : ""}">
                <a href="${page.path}" class="nav-link dropdown-toggle">
                  <span class="nav-icon">${page.icon}</span>
                  ${page.name}
                  <span class="dropdown-arrow">▼</span>
                </a>
                <ul class="dropdown-menu">
                  ${page.dropdown
                    .map(
                      (subPage) => `
                    <li>
                      <a href="${subPage.path}" class="dropdown-link ${currentPage === subPage.path ? "active" : ""}">
                        ${subPage.name}
                      </a>
                    </li>
                  `
                    )
                    .join("")}
                </ul>
              </li>
            `;
            } else {
              return `
              <li class="nav-item ${isActive ? "active" : ""}">
                <a href="${page.path}" class="nav-link">
                  <span class="nav-icon">${page.icon}</span>
                  ${page.name}
                </a>
              </li>
            `;
            }
          })
          .join("")}
      </ul>
    </div>
  `;

  return nav;
}

// CSS styles for navigation
export const navigationStyles = `
  .app-navigation {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    width: 100%;
  }

  .nav-container {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1rem;
  }

  .nav-brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: white;
    font-weight: 600;
    font-size: 1.25rem;
  }

  .nav-logo {
    font-size: 1.5rem;
  }

  .nav-menu {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
    gap: 0.5rem;
  }

  .nav-item {
    position: relative;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 1.25rem;
    color: rgba(255, 255, 255, 0.9);
    text-decoration: none;
    border-radius: 6px;
    transition: all 0.2s ease;
    font-weight: 500;
  }

  .nav-link:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .nav-item.active .nav-link {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }

  .nav-icon {
    font-size: 1.1rem;
  }

  /* Dropdown styles */
  .dropdown {
    position: relative;
  }

  .dropdown-toggle {
    cursor: pointer;
  }

  .dropdown-arrow {
    font-size: 0.8rem;
    transition: transform 0.2s ease;
  }

  .dropdown:hover .dropdown-arrow {
    transform: rotate(180deg);
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    min-width: 200px;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    transition: all 0.2s ease;
    list-style: none;
    padding: 0.5rem 0;
    margin: 0;
    z-index: 1001;
  }

  .dropdown:hover .dropdown-menu {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }

  .dropdown-link {
    display: block;
    padding: 0.75rem 1.25rem;
    color: #333;
    text-decoration: none;
    transition: background 0.2s ease;
    font-weight: 500;
  }

  .dropdown-link:hover {
    background: #f8f9fa;
    color: #667eea;
  }

  .dropdown-link.active {
    background: #667eea;
    color: white;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .nav-container {
      flex-direction: column;
      padding: 1rem;
      gap: 1rem;
    }

    .nav-menu {
      flex-wrap: wrap;
      justify-content: center;
    }

    .nav-link {
      padding: 0.75rem 1rem;
      font-size: 0.9rem;
    }

    .dropdown-menu {
      position: static;
      opacity: 1;
      visibility: visible;
      transform: none;
      box-shadow: none;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      margin-top: 0.5rem;
    }

    .dropdown-link {
      color: rgba(255, 255, 255, 0.9);
    }

    .dropdown-link:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }
  }
`;

// Initialize navigation on any page
export function initializeNavigation(currentPage = "") {
  // Add styles to head
  const style = document.createElement("style");
  style.textContent = navigationStyles;
  document.head.appendChild(style);

  // Create and insert navigation at the very top
  const nav = createNavigation(currentPage);
  document.body.insertBefore(nav, document.body.firstChild);

  // Ensure body has no margin/padding that would interfere
  document.body.style.margin = "0";
  document.body.style.padding = "0";

  // Add top padding to body to account for fixed navigation
  // Wait for nav to be rendered to get its height
  setTimeout(() => {
    const navHeight = nav.offsetHeight;
    document.body.style.paddingTop = navHeight + "px";
  }, 0);
}
