const initialState = {
  selectedSet: new Set(),
  options: new Array(200).fill(0).map((arr, index) => ({
    label: `option ${index + 1}`,
    value: index + 1,
  })),
  uuid: ''
};

/**
 * return template html
 * @param {Object} props
 * @returns
 */
const template = (props) => {
  // write your html here
  // if using template literal, i.e. `<div>${child}</div>`, return with stringToHTML()
  // const {...} = props
  return wrapperFragment([MainContainer()]);
};

const onStateUpdate = (oldState, newState) => {
  console.log('old state: ', oldState);
  console.log('new state: ', newState);
};

const renderer = new DynamicRender({
  selector: '#render-area',
  data: initialState,
  template: (props) => {
    return template(props);
  },
  actions: [onStateUpdate],
});

// start rendering
renderer.render();