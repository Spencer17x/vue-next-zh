---
sidebar: auto
---

# Composition API RFC

- 开始时间: 2019-07-10
- 目标主要版本: 2.x / 3.x
- 参考 Issues: [#42](https://github.com/vuejs/rfcs/pull/42)
- 实施PR:（将此留空）

## 摘要(Summary)

Composition API 介绍：一组基于功能的附加API，允许灵活地组合组件逻辑。

<iframe src="https://player.vimeo.com/video/365349055" width="640" height="360" frameborder="0" allow="autoplay; fullscreen" allowfullscreen="allowfullscreen"></iframe>

观看 Vue Mastery 的 [Vue3基础课程](https://www.vuemastery.com/courses/vue-3-essentials/why-the-composition-api/)。下载 [Vue3备忘单](https://www.vuemastery.com/vue-3-cheat-sheet/)。

## 基本例子(Basic example)

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

## 动机(Motivation)

### 逻辑重用和代码组织(Logic Reuse & Code Organization)

我们都喜欢Vue非常容易上手，并使中小型应用程序的构建变得轻而易举。
但是如今，随着Vue的采用率增长，许多用户也正在使用Vue来构建大型项目，这些项目是由多个开发人员组成的团队在很长的时间内进行迭代和维护的。
多年来，我们目睹了其中一些项目遇到了Vue当前API所带来的编程模型的限制。
这些问题可以概括为两类：

1. 随着功能的增长，复杂组件的代码变得越来越难以推理。
   这种情况尤其发生在开发人员正在阅读自己未编写的代码时。
   根本原因是Vue的现有API通过选项强制执行代码组织，但是在某些情况下，通过逻辑考虑来组织代码更有意义。
   
2. 一种干净且免费的机制，用于提取和重用多个组件之间的逻辑。（更多细节在 [逻辑提取和重用](#逻辑提取和重用-logic-extraction-and-reuse)）

该RFC中提出的API在组织组件代码时为用户提供了更大的灵活性。
现在可以将代码组织为每个函数都处理特定功能的函数，而不必总是通过选项来组织代码。
API还使在组件之间甚至外部组件之间提取和重用逻辑变得更加简单。
我们将在 [设计细节](#设计细节-detailed-design) 部分中说明如何实现这些目标。

### 更好的类型推断(Better Type Inference)

开发人员在大型项目上的另一个常见功能要求是更好的TypeScript支持。
Vue当前的API在与TypeScript集成时提出了一些挑战，这主要是因为Vue仅依靠一个 ```this``` 上下文来公开属性，并且在Vue组件中使用 ```this``` 比普通JavaScript更具魔力。
（例如，嵌套在方法下的内部函数 ```this``` 指向组件实例，而不是方法对象）。
换句话说，Vue现有的API在设计时就没有考虑类型推断，所以在尝试使其与TypeScript完美配合时会产生很多复杂性。

今天，大多数将Vue与TypeScript一起使用的用户正在使用 ```vue-class-component```，这是一个库，可将组件编写为TypeScript类（在装饰器的帮助下）。在设计3.0时，我们尝试提供一个内置的Class API，以更好地解决 [先前（已删除）RFC](https://github.com/vuejs/rfcs/pull/17) 中的键入问题。但是，当我们在设计上进行讨论和迭代时，我们注意到，要使Class API解决类型问题，它必须依赖装饰器-这是一个非常不稳定的第2阶段提案，在实现细节方面存在很多不确定性。这使其成为一个相当危险的基础。（有关类API类型问题的更多详细信息，请点击 [此处](#类api的类型问题-type-issues-with-class-api)）

相比之下，此RFC中提议的API大多使用普通的变量和函数，它们自然是类型友好的。用建议的API编写的代码可以享受完整的类型推断，几乎不需要手动类型提示。这也意味着用提议的API编写的代码在TypeScript和普通JavaScript中看起来几乎相同，因此，即使非TypeScript用户也可以从键入中受益，以获得更好的IDE支持。


## 设计细节(Detailed Design)

### API 介绍(API Introduction)

这里提出的API并没有引入新的概念，而是更多地将Vue的核心功能（例如创建和观察响应状态）公开为独立功能。在这里，我们将介绍一些最基本的API，以及如何使用它们代替2.x选项来表达组件内逻辑。请注意，本节重点介绍基本概念，因此不会详细介绍每个API。完整的API规范可在 [API参考](#api) 部分中找到。

#### 响应式状态和副作用(Reactive State and Side Effects)

让我们从一个简单的任务开始：声明一些响应式状态。

``` js
import { reactive } from 'vue'

// reactive state
const state = reactive({
  count: 0
})
```

```reactive``` 等效于2.x中当前的 ```Vue.observable（）``` API，已重命名以避免与 RxJS observables 混淆。在这里，返回 ```state``` 是所有Vue用户都应该熟悉的响应式对象。

Vue中响应式状态的基本用例是我们可以在渲染期间使用它。由于依赖关系跟踪，当响应式状态更改时，视图会自动更新。在DOM中渲染某些内容被视为“副作用”：我们的程序正在修改程序本身（DOM）外部的状态。要应用并根据反应状态自动重新应用副作用，我们可以使用 ```watchEffect``` API：

``` js
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

``` js
function increment() {
  state.count++
}

document.body.addEventListener('click', increment)
```

但是使用Vue的模板系统，我们不需要与 ```innerHTML``` 纠缠或手动附加事件侦听器。让我们使用一个假设的 ```renderTemplate``` 方法简化该示例，以便我们专注于响应式方面：

``` js
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

#### 计算状态和引用(Computed State and Refs)

有时我们需要依赖于其他状态的状态-在Vue中，这是通过计算属性来处理的。要直接创建计算值，我们可以使用 ```computed``` API：

``` js
import { reactive, computed } from 'vue'

const state = reactive({
  count: 0
})

const double = computed(() => state.count * 2)
```

```computed``` 这里返回多少呢 ？如果我们猜测如何在内部实现 ```computed```，我们可能会想到以下内容：

``` js
// simplified pseudo code
function computed(getter) {
  let value
  watchEffect(() => {
    value = getter()
  })
  return value
}
```

但是我们知道这是行不通的：如果 ```value``` 是数字之类的原始类型，则返回值后，它与 ```computed``` 的内部更新逻辑的连接将丢失。这是因为JavaScript基本类型是通过值而不是通过引用传递的：

![pass by value vs pass by reference](https://www.mathwarehouse.com/programming/images/pass-by-reference-vs-pass-by-value-animation.gif)

将值分配给对象作为属性时，也会发生相同的问题。如果一个反应性值在分配为属性或从函数返回时不能保持其响应式，那么它将不是很有用。为了确保我们始终可以读取计算的最新值，我们需要将实际值包装在一个对象中，然后返回该对象：

``` js
// simplified pseudo code
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

``` js
const double = computed(() => state.count * 2)

watchEffect(() => {
  console.log(double.value)
}) // -> 0

state.count++ // -> 2
```

**在这里，```double``` 是一个我们称为 “ref” 的对象，因为它用作对其持有的内部值的响应式引用。**

> 你可能会意识到Vue已经有了 “ref” 的概念，但是仅用于引用模板（“模板引用”）中的DOM元素或组件实例。[点击此处](./api.html#setup)以查看如何将新的参考系统用于逻辑状态和模板参考。

除了 ```computed``` 的引用外，我们还可以使用 ```ref``` API直接创建普通的可变引用：

``` js
const count = ref(0)
console.log(count.value) // 0

count.value++
console.log(count.value) // 1
```

#### 引用展开(Ref Unwrapping)

::: v-pre
我们可以将ref公开为渲染上下文的属性。在内部，Vue将对ref进行特殊处理，以便在渲染上下文中遇到ref时，该上下文直接公开其内部值。这意味着在模板中，我们可以直接编写 `{{ count }}` 而不是  `{{ count.value }}`。
:::

这是同一计数器示例的版本，使用ref而不是响应式：

``` js
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

另外，当引用作为属性嵌套在响应式对象下时，它也将在访问时自动展开：

``` js
const state = reactive({
  count: 0,
  double: computed(() => state.count * 2)
})

// no need to use `state.double.value`
console.log(state.double)
```

#### 组件中的用法(Usage in Components)

到目前为止，我们的代码已经提供了可以根据用户输入进行更新的工作UI，但是该代码仅运行一次且不可重用。如果我们想重用逻辑，那么合理的下一步似乎是将其重构为一个函数：

``` js
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

``` html
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

#### 生命周期钩子(Lifecycle Hooks)

到目前为止，我们已经涵盖了组件的纯状态方面：用户输入上的反应状态，计算状态和变异状态。但是组件可能还需要执行副作用-例如，登录到控制台，发送ajax请求或在 ```window``` 上设置事件侦听器。这些副作用通常在以下时间执行：

- 当某些状态改变时；
- 挂载，更新或卸载组件时（生命周期钩子）。

我们知道我们可以使用 ```watchEffect``` 和 ```watch``` API基于状态变化来应用副作用。至于在不同的生命周期挂钩中执行副作用，我们可以使用专用的 ```onXXX``` API（直接反映现有的生命周期选项）：

``` js
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

> 有关这些API的更多详细信息，请参见 [API参考](/api/)。但是，我们建议在深入研究设计细节之前先完成以下几节。

### 代码组织(Code Organization)

至此，我们已经使用导入的函数复制了组件API，但是该做什么呢？用选项定义组件似乎要比将所有函数混合在一起来使函数更有组织性！

这是可以理解的第一印象。但是，正如动机部分所述，我们认为Composition API实际上可以带来更好的组织代码，尤其是在复杂的组件中。在这里，我们将尝试解释原因。

#### 什么是“组织机构代码”？(What is "Organized Code"?)

让我们退后一步，考虑当我们谈论“组织代码”时的真正含义。保持代码井井有条的最终目的应该是使代码更易于阅读和理解。“理解”代码是什么意思？我们真的可以仅仅因为知道组件包含哪些选项而声称自己“了解”了组件吗？您是否遇到过由另一个开发人员（例如，[这个](https://github.com/vuejs/vue-cli/blob/a09407dd5b9f18ace7501ddb603b95e31d6d93c0/packages/@vue/cli-ui/src/components/folder/FolderExplorer.vue#L198-L404)）创作的大型组件，并且很难将头放在该组件上？

想一想我们将如何引导同一个开发人员通过一个大型组件，如上面链接的组件。您很可能从“此组件正在处理X，Y和Z”开始，而不是“此组件具有这些数据属性，这些计算的属性和这些方法”。在理解组件时，我们更关心“组件正在尝试做什么”（即代码背后的意图），而不是“组件碰巧使用了哪些选项”。虽然使用基于选项的API编写的代码自然可以回答后者，但在表达前者方面做得相当差。

#### 逻辑问题与选项类型(Logical Concerns vs. Option Types)

让我们将组件要处理的“ X，Y和Z”定义为逻辑问题。小型单一用途的组件通常不存在可读性问题，因为整个组件只处理一个逻辑问题。但是，在高级用例中，这个问题变得更加突出。以 [Vue CLI UI](https://github.com/vuejs/vue-cli/blob/a09407dd5b9f18ace7501ddb603b95e31d6d93c0/packages/@vue/cli-ui/src/components/folder/FolderExplorer.vue#L198-L404) 文件浏览器为例。该组件必须处理许多不同的逻辑问题：

- 跟踪当前文件夹状态并显示其内容
- 处理文件夹导航（打开，关闭，刷新...）
- 处理新文件夹的创建
- 仅切换显示收藏夹
- 切换显示隐藏文件夹
- 处理当前工作目录更改

您是否可以通过阅读基于选项的代码立即识别并区分这些逻辑问题？这肯定是困难的。您会注意到，与特定逻辑问题相关的代码通常会分散在各处。例如，“创建新文件夹”功能使用了 [两个数据属性](https://github.com/vuejs/vue-cli/blob/a09407dd5b9f18ace7501ddb603b95e31d6d93c0/packages/@vue/cli-ui/src/components/folder/FolderExplorer.vue#L221-L222)，[一个计算属性](https://github.com/vuejs/vue-cli/blob/a09407dd5b9f18ace7501ddb603b95e31d6d93c0/packages/@vue/cli-ui/src/components/folder/FolderExplorer.vue#L240) 和 [一个方法](https://github.com/vuejs/vue-cli/blob/a09407dd5b9f18ace7501ddb603b95e31d6d93c0/packages/@vue/cli-ui/src/components/folder/FolderExplorer.vue#L387)-其中在距数据属性一百行的位置定义了该方法。

如果我们对这些逻辑问题中的每一个进行彩色编码，我们会注意到在使用组件选项表示它们时有多分散：

<p align="center">
  <img src="https://user-images.githubusercontent.com/499550/62783021-7ce24400-ba89-11e9-9dd3-36f4f6b1fae2.png" alt="file explorer (before)" width="131">
</p>

正是这种碎片化使得难以理解和维护复杂的组件。通过选项的强制分隔使基本的逻辑问题变得模糊。另外，当处理单个逻辑关注点时，我们必须不断地“跳动”选项块，以查找与该关注点相关的部分。

> 注意：原始代码可能会在一些地方得到改进，但是我们正在展示最新提交（在撰写本文时），而没有进行修改，以提供我们自己编写的实际生产代码示例。

如果我们可以并置与同一逻辑问题相关的代码，那就更好了。这正是Composition API使我们能够执行的操作。可以通过以下方式编写“创建新文件夹”功能：

``` js
function useCreateFolder (openFolder) {
  // originally data properties
  const showNewFolder = ref(false)
  const newFolderName = ref('')

  // originally computed property
  const newFolderValid = computed(() => isValidMultiName(newFolderName.value))

  // originally a method
  async function createFolder () {
    if (!newFolderValid.value) return
    const result = await mutate({
      mutation: FOLDER_CREATE,
      variables: {
        name: newFolderName.value
      }
    })
    openFolder(result.data.folderCreate.path)
    newFolderName.value = ''
    showNewFolder.value = false
  }

  return {
    showNewFolder,
    newFolderName,
    newFolderValid,
    createFolder
  }
}
```

请注意，现在如何将与“创建新文件夹”功能相关的所有逻辑并置并封装在一个函数中。由于其描述性名称，该功能在某种程度上也是自记录的。这就是我们所说的 composition function。建议使用 ```use``` 开头为函数名以表示它是一个 composition function。这种模式可以应用于组件中的所有其他逻辑问题，从而产生了许多很好的解耦功能：

<p align="center">
  <img src="https://user-images.githubusercontent.com/499550/62783026-810e6180-ba89-11e9-8774-e7771c8095d6.png" alt="file explorer (comparison)" width="600">
</p>

> 此比较不包括 import 语句和 ```setup()``` 函数。可以在 [此处](https://gist.github.com/yyx990803/8854f8f6a97631576c14b63c8acd8f2e) 找到使用Composition API重新实现的完整组件。

现在，每个逻辑关注点的代码在组合函数中并置在一起。当在大型组件上工作时，这大大减少了对恒定“跳跃”的需求。合成功能也可以在编辑器中折叠，以使组件更易于扫描：

``` js
export default {
  setup() { // ...
  }
}

function useCurrentFolderData(networkState) { // ...
}

function useFolderNavigation({ networkState, currentFolderData }) { // ...
}

function useFavoriteFolder(currentFolderData) { // ...
}

function useHiddenFolders() { // ...
}

function useCreateFolder(openFolder) { // ...
}
```

现在， ```setup()``` 函数主要用作调用所有组合函数的入口点：

``` js
export default {
  setup () {
    // Network
    const { networkState } = useNetworkState()

    // Folder
    const { folders, currentFolderData } = useCurrentFolderData(networkState)
    const folderNavigation = useFolderNavigation({ networkState, currentFolderData })
    const { favoriteFolders, toggleFavorite } = useFavoriteFolders(currentFolderData)
    const { showHiddenFolders } = useHiddenFolders()
    const createFolder = useCreateFolder(folderNavigation.openFolder)

    // Current working directory
    resetCwdOnLeave()
    const { updateOnCwdChanged } = useCwdUtils()

    // Utils
    const { slicePath } = usePathUtils()

    return {
      networkState,
      folders,
      currentFolderData,
      folderNavigation,
      favoriteFolders,
      toggleFavorite,
      showHiddenFolders,
      createFolder,
      updateOnCwdChanged,
      slicePath
    }
  }
}
```

当然，这是我们使用options API时无需编写的代码。但是请注意，```setup```  函数的读法几乎像是对组件要执行的操作的口头描述-这是基于选项的版本中完全缺少的信息。您还可以根据传递的参数清楚地看到组合函数之间的依赖关系流。最后，return语句是检查模板暴露内容的唯一位置。

给定相同的功能，通过选项定义的组件和通过组合函数定义的组件会表现出两种表达同一基本逻辑的不同方式。基于选项的API迫使我们根据选项类型组织代码，而Composition API使我们能够基于逻辑关注点组织代码。

### 逻辑提取和重用(Logic Extraction and Reuse)

当涉及跨组件提取和重用逻辑时，Composition API非常灵活。合成函数不再依赖神奇的 ```this``` 上下文，而仅依赖于其参数和全局导入的Vue API。你可以通过简单地将其导出为函数来重用组件逻辑的任何部分。你甚至可以通过导出组件整个 ```setup``` 函数达到 ```extends``` 等效功能。

让我们看一个例子：跟踪鼠标的位置。

``` js
import { ref, onMounted, onUnmounted } from 'vue'

export function useMousePosition() {
  const x = ref(0)
  const y = ref(0)

  function update(e) {
    x.value = e.pageX
    y.value = e.pageY
  }

  onMounted(() => {
    window.addEventListener('mousemove', update)
  })

  onUnmounted(() => {
    window.removeEventListener('mousemove', update)
  })

  return { x, y }
}
```

这是组件可以利用功能的方式：

``` js
import { useMousePosition } from './mouse'

export default {
  setup() {
    const { x, y } = useMousePosition()
    // other logic...
    return { x, y }
  }
}
```

在文件资源管理器示例的Composition API版本中，我们已将一些实用程序代码（例如 ```usePathUtils``` 和 ```useCwdUtils```）提取到外部文件中，因为我们发现它们对其他组件很有用。

使用现有模式（例如混合，高阶组件或无渲染组件）（通过作用域插槽），也可以实现类似的逻辑重用。互联网上有大量信息解释这些模式，因此在此我们将不再重复详细说明。高层次的想法是，与组合函数相比，这些模式中的每一个都有各自的缺点：

- 渲染上下文中公开的属性的来源不清楚。例如，当使用多个mixin读取组件的模板时，可能很难确定从哪个mixin注入了特定的属性。

- 命名空间冲突。Mixins可能会在属性和方法名称上发生冲突，而HOC可能会在预期的prop名称上发生冲突。

- 性能。HOC和无渲染组件需要额外的有状态组件实例，这会降低性能。

相比之下，使用Composition API：

- 暴露给模板的属性具有明确的来源，因为它们是从合成函数返回的值。

- 合成函数返回的值可以任意命名，因此不会发生名称空间冲突。

- 没有创建仅用于逻辑重用的不必要的组件实例。

### 现有API的用法(Usage Alongside Existing API)

Composition API可以与现有的基于 options 的API一起使用。

- Composition API在2.x options（```data```，```computed``` 和 ```methods```）之前已解决，并且无法访问由这些选项定义的属性。

- 从 ```setup()``` 返回的属性将会暴露给 ```this```，并且可以在2.x options 中访问。

### 插件开发(Plugin Development)

如今，许多Vue插件都在 ```this``` 上注入了属性。例如，Vue Router注入 ```this.$route``` 和 ```this.$route```，而Vuex注入 ```this.$store```。由于每个插件都要求用户增加注入属性的Vue类型，这使得类型推断变得棘手。

使用合成API时，没有 ```this```。相反，插件将利用内部 [```provide``` 和 ```inject```](./api.html#依赖注入) 并公开组合功能。以下是插件的假设代码：

``` js
const StoreSymbol = Symbol()

export function provideStore(store) {
  provide(StoreSymbol, store)
}

export function useStore() {
  const store = inject(StoreSymbol)
  if (!store) {
    // throw error, no store provided
  }
  return store
}
```

并在使用代码中：

``` js
// provide store at component root
//
const App = {
  setup() {
    provideStore(store)
  }
}

const Child = {
  setup() {
    const store = useStore()
    // use the store
  }
}
```

请注意，也可以通过全局API更改RFC中提议的应用程序级提供来提供 store，但是使用组件中的 ```useStore``` style API将相同。

## 缺点(Drawbacks)

### 介绍引用的开销(Overhead of Introducing Refs)

从技术上讲，Ref是此提案中引入的唯一“新”概念。引入它是为了将响应值作为变量传递，而不依赖于 ```this``` 的访问。缺点是：

1. 使用Composition API时，我们将需要不断将ref与纯值和对象区分开来，从而增加了使用API​​时的精神负担。

    通过使用命名约定（例如，将所有ref变量后缀为 ```xxxRef```）或使用类型系统，可以大大减轻心理负担。另一方面，由于提高了代码组织的灵活性，因此组件逻辑将更多地被隔离为一些小的函数，这些函数的局部上下文很简单，引用的开销很容易管理。

2. 由于需要 ```.value```，因此读取和修改ref比使用普通值更冗长。

    一些人建议使用编译时语法糖（类似于Svelte 3）来解决此问题。尽管从技术上讲这是可行的，但我们认为将其作为Vue的默认值是没有道理的（如在 [与Svelte的比较](#与svelte的比较-comparison-with-svelte) 中所讨论的）。就是说，这在用户领域作为Babel插件在技术上是可行的。

我们已经讨论了是否有可能完全避免使用Ref概念并仅使用响应性对象，但是：

- computed 的 getters 可以返回原始类型，因此不可避免地要使用类似Ref的容器。

- 仅出于响应性的考虑，仅期望或返回原始类型的组合函数也需要将值包装在对象中。如果框架没有提供标准的实现，那么用户很有可能最终会发明自己的Ref like模式（并导致生态系统碎片化）。

### 引用 vs. 响应性(Ref vs. Reactive)

可以理解，用户可能会在 ```ref``` 和 ```reactive``` 之间混淆使用哪个。首先要知道的是，您将需要了解两者才能有效地使用Composition API。独家使用一个极有可能导致神秘的解决方法或重新发明轮子。

使用 ```ref``` 和 ```reactive``` 的区别可以和您编写标准JavaScript逻辑的方式进行比较：

``` js
// style 1: separate variables
let x = 0
let y = 0

function updatePosition(e) {
  x = e.pageX
  y = e.pageY
}

// --- compared to ---

// style 2: single object
const pos = {
  x: 0,
  y: 0
}

function updatePosition(e) {
  pos.x = e.pageX
  pos.y = e.pageY
}
```

- 如果使用 ```ref```，我们将使用refs将style（1）转换为更详细的等价形式（以使基本值具有响应性）。

- 使用 ```reactive``` 几乎与style（2）相同。我们只需要创建带有 ```reactive``` 的对象即可。

但是，```reactive``` 的问题在于，复合函数的使用者必须始终保持对返回对象的引用，以保持反应性。该对象不能被破坏或散布：

``` js
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
    // reactivity lost!
    const { x, y } = useMousePosition()
    return {
      x,
      y
    }

    // reactivity lost!
    return {
      ...useMousePosition()
    }

    // this is the only way to retain reactivity.
    // you must return `pos` as-is and reference x and y as `pos.x` and `pos.y`
    // in the template.
    return {
      pos: useMousePosition()
    }
  }
}
```

提供了 [`toRefs`](./api.html#torefs) API来处理此约束-将反应对象上的每个属性转换为相应的ref：

``` js
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

### return 语句赘言(Verbosity of the Return Statement)

一些用户提出了关于 ```setup()``` 中的return语句冗长且感觉像样板的担忧。

我们认为明确的return声明有利于可维护性。它使我们能够显式控制暴露给模板的内容，并且可以作为跟踪在组件中定义模板属性的起点。

有一些建议可以自动公开在 ```setup()``` 中声明的变量，从而使return语句成为可选的。同样，我们不认为这应该是默认设置，因为它违背了标准JavaScript的直觉。但是，有一些方法可以减少用户空间中的琐事：

- IDE扩展，它根据 ```setup()``` 中声明的变量自动生成return语句

- Babel插件隐式生成并插入return语句。

### 更大的灵活性需要更多的纪律(More Flexibility Requires More Discipline)

许多用户指出，尽管Composition API在代码组织方面提供了更大的灵活性，但它也需要开发人员更多的纪律才能“正确执行”。有些人担心该API会导致经验不足的意大利面条式代码。换句话说，尽管Composition API提高了代码质量的上限，但同时也降低了代码质量的下限。

我们在一定程度上同意这一点。但是，我们认为：

1. 上限的收益远大于下限的损失。

2. 通过适当的文档和社区指导，我们可以有效地解决代码组织问题。

一些用户使用Angular 1控制器作为设计可能导致编写不良代码的示例。Composition API和Angular 1控制器之间的最大区别是，它不依赖于共享范围上下文。这使得将逻辑分成单独的功能变得非常容易，这是JavaScript代码组织的核心机制。

任何JavaScript程序都以入口文件开头（可以将其视为程序的 ```setup()```）。我们根据逻辑关注点将程序分为功能和模块来组织程序。Composition API使我们能够对Vue组件代码执行相同的操作。换句话说，使用Composition API时，编写井井有条的JavaScript代码的技能会直接转化为编写井井有条的Vue代码的技能。

## 采纳策略(Adoption strategy)

Composition API纯粹是添加的，不会影响/弃用任何现有的2.x API。它已通过 [@vue/composition库](https://github.com/vuejs/composition-api/) 作为2.x插件提供。该库的主要目标是提供一种试验API并收集反馈的方法。当前的实现是此提案的最新版本，但是由于作为插件的技术限制，可能包含一些不一致性。随着该提案的更新，它可能还会收到制动变化，因此我们不建议在此阶段在生产中使用它。

我们打算将API内置在3.0中。它将与现有的2.x选项一起使用。

对于选择仅在应用程序中使用Composition API的用户，可以提供编译时标志，以删除仅用于2.x选项的代码并减小库的大小。但是，这是完全可选的。

该API将被定位为高级功能，因为它旨在解决的问题主要出现在大规模应用程序中。我们无意修改文档以将其用作默认文档。相反，它将在文档中有其自己的专用部分。

## 附录(Appendix)

### 类API的类型问题(Type Issues with Class API)

引入类API的主要目的是提供一种具有更好TypeScript推理支持的替代API。但是，Vue组件需要将从多个源声明的属性合并到一个单独的 ```this``` 上下文中，即使使用基于Class的API也会带来一些挑战。

一个例子是 props。为了合并 props 到 ```this```，我们必须对组件类使用通用参数，或者使用装饰器。

这是使用通用参数的示例：

``` ts
interface Props {
  message: string
}

class App extends Component<Props> {
  static props = {
    message: String
  }
}
```

由于传递给泛型参数的接口仅处于类型区域，因此用户仍需要为此提供的props代理行为提供运行时props声明在 ```this```。该双重声明是多余且笨拙的。

我们已经考虑过使用装饰器作为替代：

``` ts
class App extends Component<Props> {
  @prop message: string
}
```

使用装饰器会产生对第二阶段规范的依赖，存在很多不确定性，尤其是当TypeScript的当前实现与TC39提案完全不同步时。此外，无法在 ```this.$props``` 上公开用装饰器声明的 props 类型，这会破坏TSX的支持。用户还可以假设他们可以通过 ```@prop message: string = 'foo'``` 声明prop的默认值，从技术上讲，它不能按预期工作。

另外，当前没有办法利用上下文类型作为类方法的参数-这意味着传递给Class的 ```render``` 函数的参数不能基于Class的其他属性来推断类型。

### 与React Hooks的比较(Comparison with React Hooks)

基于函数的API提供了与React Hooks相同级别的逻辑组合功能，但有一些重要的区别。与React钩子不同， ```setup()``` 函数仅被调用一次。这意味着使用Vue的Composition API的代码为：

- 总的来说，它更符合惯用的JavaScript代码的直觉；
- 对呼叫顺序不敏感，可以有条件；
- 每次提炼不重复调用，产生的GC压力较小；
- 不必考虑几乎总是需要 ```useCallback``` 的问题，以防止内联处理程序导致子组件的过度重新渲染；
- 如果用户忘记传递正确的依赖项数组，```useEffect``` 和 ```useMemo``` 可能会捕获过时的变量，这不受此问题的影响。Vue的自动依赖关系跟踪确保观察者和计算值始终正确无效。

我们认可React Hooks的创造力，这是该建议的主要灵感来源。但是，上面提到的问题确实存在于设计中，我们注意到Vue的反应性模型提供了解决这些问题的方法。

### 与Svelte的比较(Comparison with Svelte)

尽管采用的路线截然不同，但是Composition API和Svelte 3的基于编译器的方法实际上在概念上有很多共通之处。这是一个并行的示例：

#### Vue

``` html
<script>
import { ref, watchEffect, onMounted } from 'vue'

export default {
  setup() {
    const count = ref(0)

    function increment() {
      count.value++
    }

    watchEffect(() => console.log(count.value))

    onMounted(() => console.log('mounted!'))

    return {
      count,
      increment
    }
  }
}
</script>
```

#### Svelte

``` html
<script>
import { onMount } from 'svelte'

let count = 0

function increment() {
  count++
}

$: console.log(count)

onMount(() => console.log('mounted!'))
</script>
```

Svelte代码看起来更简洁，因为它在编译时执行以下操作：

- 将整个 ```<script>``` 块（import语句除外）隐式包装到为每个组件实例调用的函数中（而不是仅执行一次）
- 隐式注册对可变突变的反应性
- 隐式地将所有作用域内的变量暴露给渲染上下文
- 将 ```$``` 语句编译为重新执行的代码

从技术上讲，我们可以在Vue中做同样的事情（可以通过userland Babel插件来完成）。我们不这样做的主要原因是与标准JavaScript保持一致。如果您从Vue文件的 ```<script>``` 块中提取代码，我们希望它的工作原理与标准ES模块完全相同。另一方面，Svelte ```<script>``` 块中的代码在技术上不再是标准JavaScript。这种基于编译器的方法存在很多问题：

1. 无论是否编译，代码的工作方式都不同。作为一个渐进式框架，许多Vue用户可能希望/需要/必须在没有构建设置的情况下使用它，因此，编译后的版本不能成为默认版本。另一方面，Svelte将自身定位为编译器，并且只能与构建步骤一起使用。这是两个框架在有意识地做出的折衷。

2. 代码在内部/外部组件中的工作方式不同。当试图将逻辑从Svelte组件中提取到标准JavaScript文件中时，我们将失去神奇的简洁语法，而不得不使用 [更为冗长的低级API](https://svelte.dev/docs#svelte_store)。

3. Svelte的反应性编译仅适用于顶级变量-它不涉及在函数内部声明的变量，因此我们 [无法在组件内部声明的函数中封装反应性状态](https://svelte.dev/repl/4b000d682c0548e79697ddffaeb757a3?version=3.6.2)。这对具有功能的代码组织施加了不小的限制-正如我们在RFC中所展示的那样，这对于保持大型组件的可维护性非常重要。

4. [非标准语义使与TypeScript集成成为问题。](https://github.com/sveltejs/svelte/issues/1639)

这绝不是说Svelte 3是一个坏主意-实际上，这是一种非常创新的方法，我们非常尊重Rich的工作。但是基于Vue的设计约束和目标，我们必须做出不同的权衡。
