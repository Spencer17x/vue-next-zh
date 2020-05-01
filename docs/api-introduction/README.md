# API介绍

这里提出的API并没有引入新的概念，而是更多地将Vue的核心功能（例如创建和观察响应状态）公开为独立功能。在这里，我们将介绍一些最基本的API，以及如何使用它们代替2.x选项来表达组件内逻辑。请注意，本节重点介绍基本概念，因此不会详细介绍每个API。完整的API规范可在 [API参考](https://composition-api.vuejs.org/api.html) 部分中找到。

#### 反应状态和副作用

让我们从一个简单的任务开始：声明一些反应状态。

```js
import { reactive } from 'vue'

// reactive state
const state = reactive({
  count: 0
})
```

```reactive``` 等效于2.x中当前的 ```Vue.observable（）``` API，已重命名以避免与 RxJS observables 混淆。在这里，返回 ```state``` 是所有Vue用户都应该熟悉的响应式对象。

Vue中响应式状态的基本用例是我们可以在渲染期间使用它。由于依赖关系跟踪，当响应式状态更改时，视图会自动更新。在DOM中渲染某些内容被视为“副作用”：我们的程序正在修改程序本身（DOM）外部的状态。要应用并根据反应状态自动重新应用副作用，我们可以使用 ```watchEffect``` API：

```js
import { reactive, watchEffect } from 'vue'

const state = reactive({
  count: 0
})

watchEffect(() => {
  document.body.innerHTML = `count is ${state.count}`
})
```

```watchEffect```需要一个函数，该函数可以应用所需的副作用（在这种情况下，设置 ```innerHTML```）。它立即执行该函数，并跟踪其在执行期间用作依赖项的所有响应状态属性。在此，在初始执行之后，```state.count``` 将作为该监视程序的依赖项进行跟踪。将来改变 ```state.count``` 时，内部函数将再次执行。

这是Vue响应系统的本质。当你从组件中的 ```data()``` 返回对象时，它会在内部由 ```reactive()``` 变为响应式的。模板被编译为使用这些响应式属性的渲染函数（认为是更有效的 ```innerHTML```）。

> ```watchEffect``` 与 2.x ```watch``` 选项类似，但是它不需要分离被监视的数据源和副作用回调。Composition API还提供了一个 ```watch``` 函数，其行为与2.x完全相同。

继续上面的示例，这是我们处理用户输入的方式：

```js
function increment() {
  state.count++
}

document.body.addEventListener('click', increment)
```

但是使用Vue的模板系统，我们不需要与 ```innerHTML``` 纠缠或手动附加事件侦听器。让我们使用一个假设的 ```renderTemplate``` 方法简化该示例，以便我们专注于响应式方面：

```js
import { reactive, watchEffect } from 'vue'

const state = reactive({
  count: 0
})

function increment() {
  state.count++
}

const renderContext = {
  state,
  increment
}

watchEffect(() => {
  // hypothetical internal code, NOT actual API
  renderTemplate(
    `<button @click="increment">{{ state.count }}</button>`,
    renderContext
  )
})
```

#### 计算状态和引用

有时我们需要依赖于其他状态的状态-在Vue中，这是通过计算属性来处理的。要直接创建计算值，我们可以使用 ```computed``` API：

```js
import { reactive, computed } from 'vue'

const state = reactive({
  count: 0
})

const double = computed(() => state.count * 2)
```

```computed``` 这里返回多少呢 ？如果我们猜测如何在内部实现 ```computed```，我们可能会想到以下内容：

```js
// 简化伪代码
function computed(getter) {
  let value
  watchEffect(() => {
    value = getter()
  })
  return value
}
```

但是我们知道这是行不通的：如果 ```value``` 是数字之类的原始类型，则返回值后，它与 ```computed``` 的内部更新逻辑的连接将丢失。这是因为JavaScript基本类型是通过值而不是通过引用传递的：

![示例图](https://blog.penjee.com/wp-content/uploads/2015/02/pass-by-reference-vs-pass-by-value-animation.gif)

将值分配给对象作为属性时，也会发生相同的问题。如果一个反应性值在分配为属性或从函数返回时不能保持其响应式，那么它将不是很有用。为了确保我们始终可以读取计算的最新值，我们需要将实际值包装在一个对象中，然后返回该对象：

```js
// 简化伪代码
function computed(getter) {
  const ref = {
    value: null
  }
  watchEffect(() => {
    ref.value = getter()
  })
  return ref
}
```


