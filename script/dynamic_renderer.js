/* 
Author: Anthony Wong (shino369)

es6 support is needed

A function written in vanilla js. Perform dynamic rendering mainly using ES6 Proxy
Can subscribe to state changes and invoke re-render.
Suitable for adding a specific part of area for dynamic rendering.

Provided a create function for writing functional component.
call: DRJS.create({props: {...}, children: [...], name: string})

provide scope by calling DRJS.exec(()=>{...your code here})
will fire after window onload

repo: https://github.com/shino369/vanilla-js-dynamic-renderer

*/

// all warpped by DRJS to prevent conflict
const DRJS = {
  /**
   * @type {{[key:string]: (()=>void)[]}}
   */
  registeredFunc: {},
  /**
   * register annoymous function to window for scope separation
   * @param {() => void} domReadyAction
   * @param {string | undefined} uniqueKey
   * @returns
   */
  register: (domReadyAction, uniqueKey = undefined) => {
    const registerKey = uniqueKey || crypto.randomUUID()
    if (!DRJS.registeredFunc[registerKey]) {
      DRJS.registeredFunc[registerKey] = []
    }

    DRJS.registeredFunc[registerKey].push(domReadyAction)
    return registerKey
  },
  /**
   * remove registered function
   * @param {string} uniqueKey
   */
  unRegister: (uniqueKey) => {
    if (DRJS.registeredFunc[uniqueKey]) {
      delete DRJS.registeredFunc[uniqueKey]
    }
  },
  /**
   * exec function when dom loaded. can directly use it to declare
   * @param {() => void} domReadyAction
   * @param {string | undefined} uniqueKey
   */
  exec: (domReadyAction, uniqueKey = undefined) => {
    const key = DRJS.register(domReadyAction, uniqueKey)
    const load = window.onload
    if (DRJS.registeredFunc[key] && Array.isArray(DRJS.registeredFunc[key])) {
      window.onload = () => {
        // concat func
        if (load) {
          load()
        }
        DRJS.registeredFunc[key].forEach((fn) => {
          fn()
        })
        // remove
        DRJS.unRegister(key)
      }
    }
  },
  /**
   * function debouncer
   * @param {Function} callback
   * @param {number} wait
   * @returns
   */
  debounce: (callback, wait) => {
    let timeoutId = null
    return (...args) => {
      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        callback.apply(null, args)
      }, wait)
    }
  },
  /**
   * function to create node by props.
   * @param {{
   * name: string
   * props: {[key:string]: unknown}
   * children: Element | Element[] | string | string[]
   * }} elementProps
   * @returns
   */
  create: (elementProps) => {
    const { name, props, children } = elementProps
    const newNode = document.createElement(name)

    const propsLsit = Object.entries(props || {})
    propsLsit.forEach(([key, value]) => {
      if (key === 'event') {
        const listerners = Object.entries(value)
        listerners.forEach(([ls_key, func]) => {
          newNode.addEventListener(ls_key, func)
        })
      } else {
        if (key === 'style') {
          if (typeof value === 'string') {
            newNode.setAttribute('style', value)
          } else {
            const styleList = Object.entries(value)
            styleList.forEach(([styleKey, styleValue]) => {
              newNode.style[styleKey] = styleValue
            })
          }
        } else {
          newNode.setAttribute(key, value)
          //   newNode[_key] = value
        }
      }
    })

    if (children) {
      if (Array.isArray(children)) {
        children.forEach((child) => {
          if (typeof child === 'string' || typeof child === 'number') {
            newNode.appendChild(document.createTextNode(child))
          } else if (child instanceof Element) {
            newNode.appendChild(child)
          }
        })
      } else {
        if (typeof children === 'string' || typeof children === 'number') {
          newNode.appendChild(document.createTextNode(children))
        } else if (children instanceof Element) {
          newNode.appendChild(children)
        }
      }
    }

    return newNode
  },
  /**
   * wrap element into fragment if necessary
   * @param {Element[]} elements
   * @returns
   */
  wrapperFragment: (elements) => {
    const fragment = new DocumentFragment()
    elements.forEach((element) => {
      fragment.appendChild(element)
    })
    return fragment
  },
  /**
   * Get the content from a node
   * @param  {Element}   node The node
   * @return {String}      The type
   */
  getNodeContent: (node) => {
    if (node.childNodes && node.childNodes.length > 0) return null
    return node.textContent
  },
  /**
   * Get the type for a node
   * @param  {Element}   node The node
   * @return {String}      The type
   */
  getNodeType: (node) => {
    if (node.nodeType === 3) return 'text'
    if (node.nodeType === 8) return 'comment'
    return node.tagName.toLowerCase()
  },
  /**
   * check is element
   * @param {*} element
   * @returns
   */
  isNodeElement: (element) => {
    return element instanceof Element || element instanceof Document
  },

  /**
   * Compare the template to the UI and make updates
   * @param  {Element} newNode The virtual dom
   * @param  {Element} element The real dom
   */
  diff: (newNode, element) => {
    // console.log('%c [start comparing diff...]', DRJS.consoleStyle);

    // Get arrays of child nodes
    const domNodes = Array.prototype.slice.call(element.childNodes)
    const templateNodes = Array.prototype.slice.call(newNode.childNodes)

    // remove extra element
    let count = domNodes.length - templateNodes.length
    if (count > 0) {
      for (; count > 0; count--) {
        domNodes[domNodes.length - count].parentNode.removeChild(domNodes[domNodes.length - count])
      }
    }

    // Diff each item
    templateNodes.forEach((node, index) => {
      if (!domNodes[index]) {
        element.appendChild(node)
        return
      }

      // If element is not the same type, replace it with new element
      if (DRJS.getNodeType(node) !== DRJS.getNodeType(domNodes[index])) {
        domNodes[index].parentNode.replaceChild(node.cloneNode(true), domNodes[index])
        return
      }

      // If content or other attrs are different, replace it
      const templateContent = DRJS.getNodeContent(node)

      // classname
      const attrList = ['class', 'style']
      attrList.forEach((attr) => {
        if (DRJS.isNodeElement(domNodes[index]) && domNodes[index].getAttribute(attr) !== node.getAttribute(attr)) {
          domNodes[index].setAttribute(attr, node.getAttribute(attr))
        }
      })

      if (
        templateContent &&
        templateContent !== DRJS.getNodeContent(domNodes[index])
        // || !node.isEqualNode(domNodes[index])
      ) {
        domNodes[index].textContent = templateContent
      }

      // If target element should be empty, wipe it
      if (domNodes[index].childNodes.length > 0 && node.childNodes.length < 1) {
        console.log('remove')
        domNodes[index].innerHTML = ''
        return
      }

      // build element if it is empty
      if (domNodes[index].childNodes.length < 1 && node.childNodes.length > 0) {
        const fragment = document.createDocumentFragment()
        DRJS.diff(node, fragment)
        domNodes[index].appendChild(fragment)
        return
      }

      // continue diff children
      if (node.childNodes.length > 0) {
        DRJS.diff(node, domNodes[index])
      }
    })
  },
  // global constant
  consoleStyle: `color: white; background: #483D8B; padding: 0.25rem;`,
}

/**
 * main renderer class
 */
class DynamicRender {
  /**
   * rendering section
   * @type {HTMLElement}
   */
  element

  /**
   * any object to be used in proxy any => any
   * @type {{[key:string] : unknown}}
   */
  _state

  /**
   * entry function to create template HTML
   * @type {(state: {[key:string] : unknown}) => HTMLElement}
   */
  template
  /**
   * debounce rendering frame
   * @type {(() => void) | null}
   */
  debounce

  constructor(options) {
    this.element = document.querySelector(options.selector)
    // console.info('%c [start rendering in]: ', DRJS.consoleStyle, this.element)
    this._state = new Proxy(options.data, this.proxyHandler(this, options.actions))
    this.template = options.template
    this.debounce = null
  }

  get state() {
    return this._state
  }

  // should not set the whole state except constructor
  set state(newState) {
    try {
      throw new Error('Should mutate the state directly. Use setState().')
    } catch (e) {
      console.warn(e.message)
    }
    // this._state = new Proxy(newState, this.proxyHandler(this, option.actions));
    // debounce(this);
    // return true;
    return false
  }

  /**
   * set state function
   * @param {{[key:string] : unknown}} newState
   */
  setState = (newState) => {
    const statesEntries = Object.entries(newState)
    statesEntries.forEach(([key, value], index) => {
      if (value || value === '') {
        this._state[key] = value
      }
    })
  }

  render = () => {
    // Convert the template to HTML
    const templateHTML = this.template(this._state)

    // Diff the DOM
    DRJS.diff(templateHTML, this.element)
  }

  /**
   * debounce rendering
   * @param {DynamicRender} instance // this
   */
  debounceRender = (instance) => {
    // If there's a pending render, cancel it
    if (instance.debounce) {
      window.cancelAnimationFrame(instance.debounce)
    }
    // Setup the new render to run at the next animation frame
    instance.debounce = window.requestAnimationFrame(() => {
      instance.render()
    })
  }

  customDebouncedRender = DRJS.debounce((func) => {
    func()
  }, 0)

  /**
   * accumulate the stack of old proxy value in an setstate action
   * @type {{[key:string] : unknown}[]}
   */
  oldStack = []
  /**
   * proxy handler
   * @param {DynamicRender} instance renderer   // this
   * @param {((oldState: any, newState: any) => any)[]} actions custom afterward action
   * @returns
   */
  proxyHandler = (instance, actions = []) => ({
    /**
     *
     * @param {*} proxyObj
     * @param {string} key
     * @returns
     */
    get: (proxyObj, key) => {
      // to prevent too many proxy listener, avoid proxy child level array || object
      // basically all settter method is calling setState in DynamicRender class

      const prop = proxyObj[key]
      if (typeof prop == 'undefined') {
        return
      }

      // if (
      //   !proxyExist.has(proxyObj[key]) &&
      //   ['[object Object]', '[object Array]'].indexOf(Object.prototype.toString.call(proxyObj[key])) > -1
      // ) {
      //   // console.info('%c [add new proxy on]: ', DRJS.consoleStyle, [key]);
      //   const newProxied = new Proxy(proxyObj[key], this.proxyHandler(instance, actions));
      //   proxyExist.add(newProxied);
      //   proxyObj[key] = newProxied;
      // }

      return proxyObj[key]
    },

    /**
     *
     * @param {*} proxyObj
     * @param {string} key
     * @param {*} value
     * @returns
     */
    set: (proxyObj, key, value) => {
      //  console.info('%c [props changed]: ', DRJS.consoleStyle, [key, value])
      this.oldStack.push({ ...proxyObj })
      proxyObj[key] = value

      const func = () => {
        this.debounceRender(instance)
        // custom action want to perform along with rerender
        if (actions.length > 0) {
          actions.forEach((action) => {
            action(this.oldStack[0], proxyObj)
          })
          this.oldStack = []
        }
      }
      // func()
      this.customDebouncedRender(func)

      return true
    },
    deleteProperty: (proxyObj, key) => {
      delete proxyObj[key]
      this.debounceRender(instance)
      return true
    },
  })
}
