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

此外，我们还需要拦截对对象的 ```.value``` 属性的读/写操作，以执行依赖关系跟踪和更改通知（为简单起见，此处省略了代码）。现在，我们可以按引用传递计算所得的值，而不必担心失去反应性。权衡是为了获取最新值，我们现在需要通过 ```.value``` 访问它：

```js
const double = computed(() => state.count * 2)

watchEffect(() => {
  console.log(double.value)
}) // -> 0

state.count++ // -> 2
```

在这里，```double``` 是一个我们称为 “ref” 的对象，因为它用作对其持有的内部值的响应式引用。

> 你可能会意识到Vue已经有了 “ref” 的概念，但是仅用于引用模板（“模板引用”）中的DOM元素或组件实例。[点击此处](https://vue-composition-api-rfc.netlify.app/api.html#setup)以查看如何将新的参考系统用于逻辑状态和模板参考。

除了 ```computed``` 的引用外，我们还可以使用 ```ref``` API直接创建普通的可变引用：

```js
const count = ref(0)
console.log(count.value) // 0

count.value++
console.log(count.value) // 1
```

#### ref 展开

::: v-pre
我们可以将ref公开为渲染上下文的属性。在内部，Vue将对ref进行特殊处理，以便在渲染上下文中遇到ref时，该上下文直接公开其内部值。这意味着在模板中，我们可以直接编写 `{{ count }}` 而不是  `{{ count.value }}`。
:::

这是同一计数器示例的版本，使用ref而不是响应式：

```js
import { ref, watch } from 'vue'

const count = ref(0)

function increment() {
  count.value++
}

const renderContext = {
  count,
  increment
}

watchEffect(() => {
  renderTemplate(
    `<button @click="increment">{{ count }}</button>`,
    renderContext
  )
})
```

另外，当引用作为属性嵌套在反应对象下时，它也将在访问时自动展开：

```js
const state = reactive({
  count: 0,
  double: computed(() => state.count * 2)
})

// 无需使用 `state.double.value`
console.log(state.double)
```

#### 组件中的用法

到目前为止，我们的代码已经提供了可以根据用户输入进行更新的工作UI，但是该代码仅运行一次且不可重用。如果我们想重用逻辑，那么合理的下一步似乎是将其重构为一个函数：

```js
import { reactive, computed, watchEffect } from 'vue'

function setup() {
  const state = reactive({
    count: 0,
    double: computed(() => state.count * 2)
  })

  function increment() {
    state.count++
  }

  return {
    state,
    increment
  }
}

const renderContext = setup()

watchEffect(() => {
  renderTemplate(
    `<button @click="increment">
      Count is: {{ state.count }}, double is: {{ state.double }}
    </button>`,
    renderContext
  )
})
```

> 注意上面的代码如何不依赖于组件实例的存在。实际上，到目前为止引入的API都可以在组件上下文之外使用，从而使我们能够在更广泛的场景中利用Vue的响应系统。

现在，如果我们离开了调用 ```setup()```，创建监视程序并将模板呈现到框架的任务，我们可以仅使用 ```setup()``` 函数和模板来定义组件：

```html
<template>
  <button @click="increment">
    Count is: {{ state.count }}, double is: {{ state.double }}
  </button>
</template>

<script>
import { reactive, computed } from 'vue'

export default {
  setup() {
    const state = reactive({
      count: 0,
      double: computed(() => state.count * 2)
    })

    function increment() {
      state.count++
    }

    return {
      state,
      increment
    }
  }
}
</script>
```

这是我们熟悉的单文件组件格式，只有逻辑部分（```<script>```）用不同的格式表示。模板语法保持完全相同。```<style>``` 被省略，但也可以完全相同。

#### 生命周期钩子

到目前为止，我们已经涵盖了组件的纯状态方面：用户输入上的反应状态，计算状态和变异状态。但是组件可能还需要执行副作用-例如，登录到控制台，发送ajax请求或在 ```window``` 上设置事件侦听器。这些副作用通常在以下时间执行：

* 当某些状态改变时；
* 挂载，更新或卸载组件时（生命周期钩子）。

我们知道我们可以使用 ```watchEffect``` 和 ```watch``` API基于状态变化来应用副作用。至于在不同的生命周期挂钩中执行副作用，我们可以使用专用的 ```onXXX``` API（直接反映现有的生命周期选项）：

```js
import { onMounted } from 'vue'

export default {
  setup() {
    onMounted(() => {
      console.log('component is mounted!')
    })
  }
}
```

这些生命周期注册方法只能在调用 ```setup``` 钩子中使用。它会自动找出使用内部全局状态调用 ```setup``` 钩子的当前实例。有意设计这种方式来减少将逻辑提取到外部函数时的摩擦。

> 有关这些API的更多详细信息，请参见 [API参考](https://vue-composition-api-rfc.netlify.app/api)。但是，我们建议在深入研究设计细节之前先完成以下几节。
