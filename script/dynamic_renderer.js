// global constant
const consoleStyle = `color: white; background: #483D8B; padding: 0.25rem;`

//===================== renderer element ===================

const propToStr = (props) => {
  let str = ''
  const entries = Object.entries(props) // [a: b]...
  entries.forEach(([key, value], index) => {
    if (index === 0) {
      str += ' '
    }
    str += `${key}="${value}"`
  })
  return str
}

/**
 * function debouncer
 * @param {*} callback
 * @param {*} wait
 * @returns
 */
const debounce = (callback, wait) => {
  let timeoutId = null
  return (...args) => {
    window.clearTimeout(timeoutId)
    timeoutId = window.setTimeout(() => {
      callback.apply(null, args)
    }, wait)
  }
}

/**
 * function to create node
 * @param {*} elementProps
 * @returns
 */
const create = (elementProps) => {
  const { props, children, text, name } = elementProps
  const newNode = document.createElement(name)
  const propsLsit = Object.entries(props)
  propsLsit.forEach(([key, value]) => {
    if (key === 'event') {
      const listerners = Object.entries(value)
      listerners.forEach(([ls_key, func]) => {
        newNode.addEventListener(ls_key, func)
      })
    } else {
      if (key === 'style') {
        const styleList = Object.entries(value)
        styleList.forEach(([styleKey, styleValue]) => {
          newNode.style[styleKey] = styleValue
        })
      } else {
        newNode[key] = value
      }
    }
  })

  if (children) {
    children.forEach((child) => {
      newNode.appendChild(child)
    })
  }

  if (text) {
    newNode.appendChild(document.createTextNode(text))
  }

  return newNode
}

/**
 * wrap element into fragment if necessary
 * @param {*} elements
 * @returns
 */
const wrapperFragment = (elements) => {
  const fragment = new DocumentFragment()
  elements.forEach((element) => {
    fragment.appendChild(element)
  })
  return fragment
}

/**
 * convert string to html element if necessary
 * @param {*} str
 * @returns
 */
const stringToHTML = (str) => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(str, 'text/html')
  return doc.body
}

/**
 * Get the content from a node
 * @param  {Node}   node The node
 * @return {String}      The type
 */
const getNodeContent = (node) => {
  if (node.childNodes && node.childNodes.length > 0) return null
  return node.textContent
}

/**
 * Get the type for a node
 * @param  {Node}   node The node
 * @return {String}      The type
 */
const getNodeType = (node) => {
  if (node.nodeType === 3) return 'text'
  if (node.nodeType === 8) return 'comment'
  return node.tagName.toLowerCase()
}

/**
 * debounce rendering
 * @param {*} instance
 */
const debounceRender = (instance) => {
  // If there's a pending render, cancel it
  if (instance.debounce) {
    window.cancelAnimationFrame(instance.debounce)
  }
  // Setup the new render to run at the next animation frame
  instance.debounce = window.requestAnimationFrame(() => {
    instance.render()
  })
}

const isNodeElement = (element) => {
  return element instanceof Element || element instanceof Document
}

/**
 * Compare the template to the UI and make updates
 * @param  {Node} newNode The virtual dom
 * @param  {Node} element The real dom
 */
const diff = (newNode, element) => {
  // console.log('%c [start comparing diff...]', consoleStyle);

  // Get arrays of child nodes
  const domNodes = Array.prototype.slice.call(element.childNodes)
  const templateNodes = Array.prototype.slice.call(newNode.childNodes)

  // remove extra element
  let count = domNodes.length - templateNodes.length
  if (count > 0) {
    for (; count > 0; count--) {
      domNodes[domNodes.length - count].parentNode.removeChild(
        domNodes[domNodes.length - count]
      )
    }
  }

  // Diff each item
  templateNodes.forEach((node, index) => {
    if (!domNodes[index]) {
      element.appendChild(node)
      return
    }

    // If element is not the same type, replace it with new element
    if (getNodeType(node) !== getNodeType(domNodes[index])) {
      domNodes[index].parentNode.replaceChild(
        node.cloneNode(true),
        domNodes[index]
      )
      return
    }

    // If content or other attrs are different, replace it
    const templateContent = getNodeContent(node)

    // classname
    const attrList = ['class', 'style']
    attrList.forEach((attr) => {

      if (
        isNodeElement(domNodes[index]) &&
        domNodes[index].getAttribute(attr) !== node.getAttribute(attr)
      ) {
        domNodes[index].setAttribute(attr, node.getAttribute(attr))
      }
    })

    // style
    if (domNodes[index].className !== node.className) {
      domNodes[index].className = node.className
    }

    if (
      templateContent &&
      templateContent !== getNodeContent(domNodes[index])
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
      diff(node, fragment)
      domNodes[index].appendChild(fragment)
      return
    }

    // continue diff children
    if (node.childNodes.length > 0) {
      diff(node, domNodes[index])
    }
  })
}

const debouncedRender = debounce((func) => {
  func()
}, 0)

/**
 * proxy handler
 * @param {*} instance renderer
 * @param {*} action custom afterward action
 * @returns
 */
const proxyHandler = (instance, action = undefined) => ({
  get: (proxyObj, key) => {
    // to prevent too many proxy listener, will not proxy child level array || object
    // basically all settter method is calling setState in DynamicRender class

    // if (['[object Object]', '[object Array]'].indexOf(Object.prototype.toString.call(proxyObj[key])) > -1) {
    //   return new Proxy(proxyObj[key], proxyHandler(instance));
    // }

    return proxyObj[key]
  },
  set: (proxyObj, key, value) => {
    console.info('%c [props changed]: ', consoleStyle, [key, value])
    proxyObj[key] = value

    const func = () => {
      console.log('trigger rerender')
      debounceRender(instance)
      // custom action want to perform along with rerender
      if (action) {
        action()
      }
    }

    debouncedRender(func)

    return true
  },
  deleteProperty: (proxyObj, key) => {
    delete proxyObj[key]
    debounceRender(instance)
    return true
  },
})

/**
 * main renderer class
 * @param {*} options
 */
class DynamicRender {
  element
  state
  template
  debounce

  constructor(options) {
    this.element = document.querySelector(options.selector)
    console.info('%c [render area in]: ', consoleStyle, this.element)

    this.state = new Proxy(options.data, proxyHandler(this, options.action))
    this.template = options.template
    this.debounce = null
  }

  get state() {
    return this.state
  }

  //   should not set the whole state except constructor

  //   set state(newState) {
  //     this.state = new Proxy(newState, proxyHandler(this, option.action));
  //     debounce(this);
  //     return true;
  //   }

  setState = (newState) => {
    const statesEntries = Object.entries(newState)
    statesEntries.forEach(([key, value], index) => {
      if (value || value === '') {
        this.state[key] = value
      }
    })
  }

  render = () => {
    // Convert the template to HTML
    const templateHTML = this.template(this.state)

    // Diff the DOM
    diff(templateHTML, this.element)
  }
}
