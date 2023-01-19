const initialState = {
  selectedSet: new Set(),
  options: new Array(200).fill(0).map((arr, index) => ({
    label: `option ${index + 1}`,
    value: index + 1,
  })),
}

/**
 * return template html
 * @param {*} props
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
