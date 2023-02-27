/* 
Author: Anthony Wong (shino369)

es6 support is needed

A function written in vanilla js. Perform dynamic rendering mainly using ES6 Proxy
Can subscribe to state changes and invoke re-render.
Suitable for adding a specific part of area for dynamic rendering.

Provided a create function for writing functional component.
call: DRJS.create({props: {...}, children: [...], name: string})

Provided a parsing function to parse template string html to node
For event listener like <div onClick="()=>{someFunc()}">, if someFunc() is declared in local scope, pass it to 2nd param
call: DRJS.parseStr(str, {...scopeFunc})

repo: https://github.com/shino369/vanilla-js-dynamic-renderer

*/

// global constant
const consoleStyle = `color: white; background: #483D8B; padding: 0.25rem;`

//===================== renderer element ===================

/**
 * function to convert template string to html node and add props
 * @param {String} str   tempalte
 * @param {Function} scope function to be used in event listener
 * @returns
 */
const strToNode = (str, scope = {}) => {
  const template = document.createElement('div')
  template.innerHTML = str.trim()
  const node = template

  const addPropsAndEvents = (node) => {
    const attrs = node.attributes
    const props = Array.from(attrs)
      .filter((attr) => !attr.name.startsWith('on'))
      .reduce((props, attr) => {
        props[attr.name] = attr.value
        return props
      }, {})
    const events = Array.from(attrs)
      .filter((attr) => attr.name.startsWith('on'))
      .reduce((events, attr) => {
        const eventName = attr.name.slice(2)
        const eventHandler = attr.value
        events[eventName] = eventHandler
        return events
      }, {})

    Object.entries(props).forEach(([name, value]) => {
      node[name] = value
    })

    Object.entries(events).forEach(([name, value]) => {
      let fn
      if (this[value]) {
        // found in global scope
        fn = this[value]
      } else {
        const fnBody = value.replace(/(^|\W)(\w+)/g, (_, prefix, fName) =>
          fName in scope ? `${prefix}scope.${fName}` : _
        )
        // console.log(scope)
        fn = new Function('scope', `return (${fnBody})`)(scope)
      }

      // console.log(name, fn);
      node.removeAttribute('on' + name)
      node.addEventListener(name, fn)
    })
  }

  const traverse = (node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      addPropsAndEvents(node)
      Array.from(node.childNodes).forEach((child) => {
        traverse(child)
      })
    }
  }

  traverse(node)

  return wrapperFragment(node.childNodes)
}

/**
 * function debouncer
 * @param {Function} callback
 * @param {Number} wait
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
 * function to create node by props.
 * @param {Object} elementProps
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
        if (typeof value === 'string') {
          newNode.setAttribute('style', value)
        } else {
          const styleList = Object.entries(value)
          styleList.forEach(([styleKey, styleValue]) => {
            newNode.style[styleKey] = styleValue
          })
        }
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
 * @param {NodeList} elements
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
 * @param {String} str
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
    if (getNodeType(node) !== getNodeType(domNodes[index])) {
      domNodes[index].parentNode.replaceChild(node.cloneNode(true), domNodes[index])
      return
    }

    // If content or other attrs are different, replace it
    const templateContent = getNodeContent(node)

    // classname
    const attrList = ['class', 'style']
    attrList.forEach((attr) => {
      if (isNodeElement(domNodes[index]) && domNodes[index].getAttribute(attr) !== node.getAttribute(attr)) {
        domNodes[index].setAttribute(attr, node.getAttribute(attr))
      }
    })

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
 * @param {Function} action custom afterward action
 * @returns
 */
// const proxyExist = new WeakSet();
let oldStack = []
const proxyHandler = (instance, actions = []) => ({
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
    //   // console.info('%c [add new proxy on]: ', consoleStyle, [key]);
    //   const newProxied = new Proxy(proxyObj[key], proxyHandler(instance, actions));
    //   proxyExist.add(newProxied);
    //   proxyObj[key] = newProxied;
    // }

    return proxyObj[key]
  },
  set: (proxyObj, key, value) => {
    console.info('%c [props changed]: ', consoleStyle, [key, value])
    oldStack.push({ ...proxyObj })
    proxyObj[key] = value

    const func = () => {
      // console.log('trigger rerender')
      debounceRender(instance)
      // custom action want to perform along with rerender
      if (actions.length > 0) {
        actions.forEach((action) => {
          action(oldStack[0], proxyObj)
        })
        oldStack = []
      }
    }
    // func()
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
  _state
  template
  debounce

  constructor(options) {
    this.element = document.querySelector(options.selector)
    console.info('%c [render area in]: ', consoleStyle, this.element)

    this._state = new Proxy(options.data, proxyHandler(this, options.actions))
    this.template = options.template
    this.debounce = null
  }

  get state() {
    return this._state
  }

  // should not set the whole state except constructor

  set state(newState) {
    // this._state = new Proxy(newState, proxyHandler(this, option.actions));
    // debounce(this);
    // return true;
    return false
  }

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
    diff(templateHTML, this.element)
  }
}

// group
/* export if using module*/
const DRJS = {
  DynamicRender: DynamicRender,
  create: create,
  wrapper: wrapperFragment,
  parseStr: strToNode,
}

const selectedArr = [1, 2, 3]

const optionArr = {
  1: ['op1', 'op2'],
  2: ['op3', 'op4'],
  3: ['op5', 'op6'],
}

const testArr = [{label: 'a', value: 1}, {label: 'b', value: 2}, {label: 'c', value: 3}]

function testFunc(e) {
  alert(e)
}

const templateStr = `
<div class="d-flex w-70 flex-wrap">
  <div dr:for="(selected, index1) in selectedArr" dr:key="index1">
    <div dr:for="(op, index2) in optionArr[selected]" dr:key="index2">
        <div
          class="right-badge"
          dr:class="{
            'test-class': op === 'op1'
          }"
          dr:onclick="() => {
            alert(selected)
          }"
          dr:style="{
            backgroundColor: index2%2===0? 'lightgray':'lightsteelblue'
          }">
            {{ op }} {{ (function(){return 123})() }}
          </div>

          <div dr:for="(sub, index3) in testArr" dr:key="index3"> {{sub.label}} </div>
    </div>
    <div>123</div>
  </div>
</div>
`



const parseTemplateStr = (str) => {
  // create a temporary div to hold the parsed nodes
  const tempDiv = document.createElement('div')

  // replace all opening dr:for and dr:key tags with a unique placeholder
  console.log(str)
  str = str.replace(/dr:for="(.*?)"/g, 'data-v-for="$1"')

  str.replace()
  str = str.replace(/\n/g, '')

  tempDiv.innerHTML = str

  const scope = {
    ...window,
  }


  const wrapper = (elements) => {
    const fragment = new DocumentFragment()
    elements.forEach((element) => {
      fragment.appendChild(element)
    })
    return fragment
  }

  const parseFunction = (expr, scope) => {
    const fnBody = expr.replace(/(^|\W)(\w+)/g, (_, prefix, fName) => {
      return this[fName] ? `${prefix}this.${fName}` : fName in scope ? `${prefix}scope.${fName}` : _
    })
    const newFunc = new Function('scope', `return (${fnBody})`)(scope)
    return newFunc
  }

  const addPropsAndEvents = (node, scope) => {
    const attrs = node.attributes
    const newScope = {
      ...scope
    }
    const props = Array.from(attrs)
      .filter((attr) => !attr.name.startsWith('dr:on'))
      .reduce((props, attr) => {
        let ignore = false
        if(attr.name.startsWith('dr:')) {
          // console.log(attr.name, attr.value)
          const parsedObj = parseFunction(attr.value, newScope)
          // console.log(parsedObj)
          const attrObj = parsedObj
          const truncate = attr.name.slice(3)
          switch (truncate) {
            case 'class':
              // console.log(['class'])
              const concated =  Object.entries(attrObj).reduce((accu, [key, value]) => (value ? accu + key : accu + ''), '')
              // console.log(concated)
              attr.value = concated
              break
            case 'style':
              // console.log(['style'])
              Object.entries(attrObj).forEach(([styleKey, styleValue]) => {
                node.style[styleKey] = styleValue
              })
              ignore = true
              break
          }
          attr.name = truncate
          node.removeAttribute(attr.name)
        }

        if(!ignore) {
          props[attr.name] = attr.value
        }
        
        return props
      }, {})
    const events = Array.from(attrs)
      .filter((attr) => attr.name.startsWith('dr:on'))
      .reduce((events, attr) => {
        const eventName = attr.name.slice(5)
        const eventHandler = attr.value
        events[eventName] = eventHandler
        return events
      }, {})

    Object.entries(props).forEach(([name, value]) => {
      node[name] = value
    })

    Object.entries(events).forEach(([name, value]) => {
      const fn = parseFunction(value, newScope)

      // console.log(name, fn);
      node.removeAttribute('dr:on' + name)
      node.addEventListener(name, fn)
    })
  }

  const replaceTextNode = (tempDiv, scope) => {
    // tempDiv.textContent = tempDiv.textContent.replace(/\s/g, '')
    if (tempDiv.textContent) {
      const text = tempDiv.textContent
      const reg = new RegExp(/\{\{(.*?)\}\}/, 'g')
      if (!text || !reg.test(text)) {
        return void 0
      }

      tempDiv.textContent = text.replace(reg, (_, exp) => {
        return parseFunction(exp, scope)

      })
    }
  }

  const constructNested = (tempDiv) => {
    if (tempDiv.nodeType === Node.TEXT_NODE) {
      replaceTextNode(tempDiv, scope)
      return
    } else if (tempDiv.nodeType === Node.ELEMENT_NODE) {
      addPropsAndEvents(tempDiv, scope)
    }

    // get first node for each recursion, each recursion will remove the attr at last
    const vForNode = tempDiv.querySelector('[data-v-for]')
    if (vForNode) {
      const vForExpr = vForNode.getAttribute('data-v-for')
      // split the expression to [forExpr, arraykey]
      const [forExpr, keyExpr] = vForExpr.split(/\s+in\s/)
      // split the expression to [itemKey, indexKey]
      const [loopVar, indexVar] = forExpr
        .trim()
        .slice(1, -1)
        .split(/,/)
        .map((str) => str.trim())

      // get the actual array from scope. parent variable should be in global scope
      const keyArr = parseFunction(keyExpr, scope)

      // create a DocumentFragment to hold the cloned nodes
      const fragment = new DocumentFragment()

      // loop through the key array and clone the vForNode for each item
      keyArr.forEach((item, index) => {
        // create a new or replacing old scope for the cloned node for each loop
        scope[loopVar] = item
        scope[indexVar] = index
        const clonedVFor = vForNode.cloneNode(true) 
        // const frag = new DocumentFragment()
        if (clonedVFor.hasChildNodes) {
          // child node
          constructNested(clonedVFor)
          clonedVFor.childNodes.forEach((child) => {
            // if child === textnode, replace with real value, else add props
            if (child.nodeType === Node.TEXT_NODE) {
              replaceTextNode(child, scope)
            } else if (child.nodeType === Node.ELEMENT_NODE) {
              addPropsAndEvents(child, scope)
            }
          })

          // search for inner v-for
          constructNested(clonedVFor)

          //restore old value after going back from recursion
          scope[loopVar] = item
          scope[indexVar] = index
        }

        // add the cloned node to the fragment
        clonedVFor.removeAttribute('data-v-for')
        fragment.appendChild(clonedVFor)
      })

      // replace the original vForNode with the fragment
      vForNode.replaceWith(fragment)
      vForNode.removeAttribute('data-v-for')
      //next parallel node
      constructNested(tempDiv)
    } else {
      // no further v-for, but not innermost, go deep to convert textNode and add props
      if (tempDiv.hasChildNodes) {
        tempDiv.childNodes.forEach((child) => {
          constructNested(child)
        })
      }
    }
  }

  constructNested(tempDiv)
  // return the processed nodes
  return wrapper(tempDiv.childNodes)
}
