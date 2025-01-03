function data() {
  function getThemeFromLocalStorage() {
    // if user already changed the theme, use it
    if (window.localStorage.getItem('dark')) {
      return JSON.parse(window.localStorage.getItem('dark'))
    }

    // else return their preferences
    return (
      !!window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    )
  }

  function setThemeToLocalStorage(value) {
    window.localStorage.setItem('dark', value)
  }

  return {
    dark: getThemeFromLocalStorage(),
    toggleTheme() {
      this.dark = !this.dark
      setThemeToLocalStorage(this.dark)
    },
    isSideMenuOpen: false,
    toggleSideMenu() {
      this.isSideMenuOpen = !this.isSideMenuOpen
    },
    closeSideMenu() {
      this.isSideMenuOpen = false
    },
    isNotificationsMenuOpen: false,
    toggleNotificationsMenu() {
      this.isNotificationsMenuOpen = !this.isNotificationsMenuOpen
    },
    closeNotificationsMenu() {
      this.isNotificationsMenuOpen = false
    },
    isProfileMenuOpen: false,
    toggleProfileMenu() {
      this.isProfileMenuOpen = !this.isProfileMenuOpen
    },
    closeProfileMenu() {
      this.isProfileMenuOpen = false
    },
    isPagesMenuOpen: false,
    togglePagesMenu() {
      this.isPagesMenuOpen = !this.isPagesMenuOpen
    },
    // Modal
    isModalOpen: false,
    trapCleanup: null,
    openModal() {
      this.isModalOpen = true
      this.trapCleanup = focusTrap(document.querySelector('#modal'))
    },
    closeModal() {
      this.isModalOpen = false
      this.trapCleanup()
    },

    // Modal1
    isModal1Open: false,
    trapCleanup: null,
    openModal1() {
      this.isModal1Open = true
      this.trapCleanup = focusTrap(document.querySelector('#modal1'))
    },
    closeModal1() {
      this.isModal1Open = false
      this.trapCleanup()
    },
    
    // Modal2
    isModal2Open: false,
    trapCleanup: null,
    openModal2() {
      this.isModal2Open = true
      this.trapCleanup = focusTrap(document.querySelector('#modal2'))
    },
    closeModal2() {
      this.isModal2Open = false
      this.trapCleanup()
    },
    
    // Modal3
    isModal3Open: false,
    trapCleanup: null,
    openModal3() {
      this.isModal3Open = true
      this.trapCleanup = focusTrap(document.querySelector('#modal3'))
    },
    closeModal3() {
      this.isModal3Open = false
      this.trapCleanup()
    },
  }
}