const {create, wrapperFragment} = DRJS

const MainContainer = (props) => {
  return create({
    props: {
      className: 'main-container',
    },
    children: [Header(), InnerContainer()],
    name: 'div',
  })
}
const Header = () => {
  return create({
    props: {
      className: 'header',
    },
    children: [
      create({
        props: {
          className: 'header-text',
        },
        children: 'Vanilla-JS Dynamic Renderer',
        name: 'div',
      }),
      create({
        props: {
          style: {
            padding: '0.5rem',
          },
        },
        children: `Selected option(s): ${Array.from(
          renderer.state.selectedSet
        ).join(', ')}`,
        name: 'div',
      }),
    ],
    name: 'div',
  })
}

const InnerContainer = (props) => {
  return create({
    props: {
      className: 'inner-container',
    },
    children: [
      OptionGroup(
        renderer.state.options.map((op) => {
          return OptionItem(op)
        })
      ),
      BottomRow([AppendBtn(), ClearBtn(), ClearAllOptionBtn()]),
    ],
    name: 'div',
  })
}

// functional component
const OptionItem = (option) => {
  const optionOnClick = (e) => {
    const newSet = new Set(renderer.state.selectedSet)
    newSet.has(e) ? newSet.delete(e) : newSet.add(e)
    renderer.setState({ selectedSet: newSet, uuid: crypto.randomUUID() })
  }

  return create({
    props: {
      className: `option-item${
        renderer.state.selectedSet.has(option.value) ? ' option-selected' : ''
      }`,
      event: {
        click: () => {
          optionOnClick(option.value)
        },
      },
    },
    children: option.label,
    name: 'div',
  })
}

// functional component
const ClearBtn = () => {
  const clearAll = () => {
    // directly use global renderer
    renderer.setState({ selectedSet: new Set() })
  }
  return create({
    props: {
      className: 'option-item option-btn',
      type: 'button',
      event: {
        click: () => {
          clearAll()
        },
      },
    },
    children: 'clear all selected',
    name: 'button',
  })
}

const ClearAllOptionBtn = () => {
  const ClearAllOption = () => {
    // directly use global renderer
    renderer.setState({ selectedSet: new Set(), options: [] })
  }
  return create({
    props: {
      className: 'option-item option-btn',
      type: 'button',
      event: {
        click: () => {
          ClearAllOption()
        },
      },
    },
    children: 'clear all',
    name: 'button',
  })
}

const AppendBtn = () => {
  const append = () => {
    // directly use global renderer
    const currentOptions = renderer.state.options
    currentOptions.push({
      label: `option ${currentOptions.length + 1}`,
      value: currentOptions.length + 1,
    })

    renderer.setState({ options: currentOptions })
  }
  return create({
    props: {
      className: 'option-item option-btn',
      type: 'button',
      event: {
        click: () => {
          append()
        },
      },
    },
    children: 'append',
    name: 'button',
  })
}

// functional component
const OptionGroup = (optionsItems) => {
  return create({
    props: {
      className: 'option-group',
    },
    children: optionsItems,
    name: 'div',
  })
}

const BottomRow = (buttons) => {
  return create({
    props: {
      className: 'bottom-row',
    },
    children: buttons,
    name: 'div',
  })
}
