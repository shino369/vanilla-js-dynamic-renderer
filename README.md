# VanillaJS Dynamic Renderer

A function written in vanilla js. Perform dynamic rendering mainly using ES6 [Proxy](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Proxy)\
Can subscribe to state changes and invoke re-render.\
\
[DEMO](https://vanlilla-js-dynamic-renderer.netlify.app/)
## How to use

Include the dynamic_renderer.js file into your html file.\
In your index.html, add:

```html
<div id="render-area"></div>
```

Initialize by calling `new DynamicRender({...})` :

```javascript
const initialState = {
  selectedSet: new Set(),
  options: new Array(200).fill(0).map((arr, index) => ({
    label: `option ${index + 1}`,
    value: index + 1,
  })),
}

/**
 * return template html
 * @param {Object} props
 * @returns
 */
const template = (props) => {
  // write your html here
  // if using template literal, i.e. `<div>${child}</div>`, return with stringToHTML()
  // const {...} = props
  return wrapperFragment([MainContainer()])
}

const renderer = new DynamicRender({
  selector: '#render-area',
  data: initialState,
  template: (props) => {
    return template(props)
  },
})

// start rendering
renderer.render()
```
