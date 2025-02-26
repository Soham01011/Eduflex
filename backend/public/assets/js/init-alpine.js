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

    // Modal5
    isModal5Open: false,
    trapCleanup: null,
    openModal5() {
      this.isModal5Open = true
      this.trapCleanup = focusTrap(document.querySelector('#modal5'))
    },
    closeModal5() {
      this.isModal5Open = false
      this.trapCleanup()
    },

    // Modal6
    isModal6Open: false,
    trapCleanup: null,
    openModal6() {
      this.isModal6Open = true
      this.trapCleanup = focusTrap(document.querySelector('#modal6'))
    },
    closeModal6() {
      this.isModal6Open = false
      this.trapCleanup()
    },

    // Modal7
    isModal7Open: false,
    trapCleanup: null,
    openModal7() {
      this.isModal7Open = true
      this.trapCleanup = focusTrap(document.querySelector('#modal7'))
    },
    closeModal7() {
      this.isModal7Open = false
      this.trapCleanup()
    },

    // Modal8
    isModal8Open: false,
    trapCleanup: null,
    openModal8() {
      this.isModal8Open = true
      this.trapCleanup = focusTrap(document.querySelector('#modal8'))
    },
    closeModal8() {
      this.isModal8Open = false
      this.trapCleanup()
    },

    // Modal9
    isModal9Open: false,
    trapCleanup: null,
    openModal9() {
      this.isModal9Open = true
      this.trapCleanup = focusTrap(document.querySelector('#modal9'))
    },
    closeModal9() {
      this.isModal9Open = false
      this.trapCleanup()
    },

    // Modal10
    isModal10Open: false,
    trapCleanup: null,
    openModal10() {
      this.isModal10Open = true
      this.trapCleanup = focusTrap(document.querySelector('#modal10'))
    },
    closeModal10() {
      this.isModal10Open = false
      this.trapCleanup()
    },

    // Modal11
    isModal11Open: false,
    trapCleanup: null,
    openModal11() {
      this.isModal11Open = true
      this.trapCleanup = focusTrap(document.querySelector('#modal11'))
    },
    closeModal11() {
      this.isModal11Open = false
      this.trapCleanup()
    },

    // Modal12
    isModal12Open: false,
    trapCleanup: null,
    openModal12() {
      this.isModal12Open = true
      this.trapCleanup = focusTrap(document.querySelector('#modal12'))
    },
    closeModal12() {
      this.isModal12Open = false
      this.trapCleanup()
    },

    // Modal13
    isModal13Open: false,
    trapCleanup: null,
    openModal13() {
      this.isModal13Open = true
      this.trapCleanup = focusTrap(document.querySelector('#modal13'))
    },
    closeModal13() {
      this.isModal13Open = false
      this.trapCleanup()
    },

    // Modal15
    isModal15Open: false,
    trapCleanup: null,
    openModal15() {
      this.isModal15Open = true
      this.trapCleanup = focusTrap(document.querySelector('#modal15'))
    },
    closeModal15() {
      this.isModal15Open = false
      this.trapCleanup()
    },

    // Modal16
    isModal16Open: false,
    trapCleanup: null,
    openModal16() {
      this.isModal16Open = true
      this.trapCleanup = focusTrap(document.querySelector('#modal16'))
    },
    closeModal16() {
      this.isModal16Open = false
      this.trapCleanup()
    },

  }
}
