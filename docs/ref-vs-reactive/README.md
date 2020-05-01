# Ref vs. Reactive

可以理解，用户可能会在 ```ref``` 和 ```reactive``` 之间混淆使用哪个。首先要知道的是，您将需要了解两者才能有效地使用Composition API。独家使用一个极有可能导致神秘的解决方法或重新发明轮子。

使用 ```ref``` 和 ```reactive``` 的区别可以和您编写标准JavaScript逻辑的方式进行比较：

```js
// style 1: 单独的变量
let x = 0
let y = 0

function updatePosition(e) {
  x = e.pageX
  y = e.pageY
}

// --- 相比 ---

// style 2: 单个对象
const pos = {
  x: 0,
  y: 0
}

function updatePosition(e) {
  pos.x = e.pageX
  pos.y = e.pageY
}
```

* 如果使用 ```ref```，我们将使用refs将style（1）转换为更详细的等价形式（以使基本值具有反应性）。
* 使用 ```reactive``` 几乎与style（2）相同。我们只需要创建带有 ```reactive``` 的对象即可。

但是，```reactive``` 的问题在于，复合函数的使用者必须始终保持对返回对象的引用，以保持反应性。该对象不能被破坏或散布：

```js
// composition function
function useMousePosition() {
  const pos = reactive({
    x: 0,
    y: 0
  })

  // ...
  return pos
}

// consuming component
export default {
  setup() {
    // reactivity 失效!
    const { x, y } = useMousePosition()
    return {
      x,
      y
    }

    // reactivity 失效!
    return {
      ...useMousePosition()
    }

    // 这是保持 reactivity 的唯一方法。
    // 您必须按原样返回pos，并将x和y分别称为pos.x和pos.y。
    // 在模板中。
    return {
      pos: useMousePosition()
    }
  }
}
```

提供了 ```toRefs``` API来处理此约束-将反应对象上的每个属性转换为相应的ref：

```js
function useMousePosition() {
  const pos = reactive({
    x: 0,
    y: 0
  })

  // ...
  return toRefs(pos)
}

// x & y are now refs!
const { x, y } = useMousePosition()
```

总结起来，有两种可行的样式：

1. 就像在普通JavaScript中声明基本类型变量和对象变量一样，使用 ```ref``` 和 ```reactive```。使用这种样式时，建议使用具有IDE支持的类型系统。
2. 尽可能使用 ```reactive```，记住从组合函数返回反应式对象时要使用 ```toRefs```。这减少了裁判的精神开销，但并没有消除对这个概念熟悉的需要。

在现阶段，我们认为现在 ```ref``` vs ```reactive``` 的最佳实践还为时过早。我们建议您从上面的两个选项中选择与您的心理模型相符的样式。我们将收集现实世界中的用户反馈，并最终提供有关此主题的更多确定性指导。
