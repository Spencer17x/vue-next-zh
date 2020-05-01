---
sidebar: auto
sidebarDepth: 2
---

# API 参考

::: tip
从Vue Mastery下载免费的 [Cheat Sheet](https://www.vuemastery.com/vue-3-cheat-sheet/)， 或者观看其 [Vue3 课程](https://www.vuemastery.com/courses/vue-3-essentials/why-the-composition-api/).
:::

## `setup`

`setup` 函数是新的组件选项。它充当在组件内部使用Composition API的入口点。

- **调用时机**

  `setup` 是在创建组件实例时在初始化 props 解析之后立即调用。生命周期方面, 它是在 `beforeCreate` 钩子之前被调用。

- **模板使用**

  如果 `setup` 返回一个对象，则该对象上的属性将合并到组件模板的渲染上下文中：

  ```html
  <template>
    <div>{{ count }} {{ object.foo }}</div>
  </template>

  <script>
    import { ref, reactive } from 'vue'

    export default {
      setup() {
        const count = ref(0)
        const object = reactive({ foo: 'bar' })

        // expose to template
        return {
          count,
          object
        }
      }
    }
  </script>
  ```

  请注意，从 `setup` 返回的 refs 在模板中访问时会自动解包，因此模板中不需要 `.value`。

- **渲染函数/JSX的用法**

  `setup` 还可以返回一个render函数，该函数可以直接使用在同一作用域中声明的反应状态：

  ```js
  import { h, ref, reactive } from 'vue'

  export default {
    setup() {
      const count = ref(0)
      const object = reactive({ foo: 'bar' })

      return () => h('div', [count.value, object.foo])
    }
  }
  ```

- **参数**

  该函数将接收到的props作为其第一个参数：

  ```js
  export default {
    props: {
      name: String
    },
    setup(props) {
      console.log(props.name)
    }
  }
  ```

  请注意，此 `props` 对象是反应性的-即，当传入新的props时将对其进行更新，并且可以使用 `watchEffect` 或 `watch` 进行观察和反应：

  ```js
  export default {
    props: {
      name: String
    },
    setup(props) {
      watchEffect(() => {
        console.log(`name is: ` + props.name)
      })
    }
  }
  ```

  但是, 不要去破坏 `props` 对象, 因为它将失去反应性：

  ```js
  export default {
    props: {
      name: String
    },
    setup({ name }) {
      watchEffect(() => {
        console.log(`name is: ` + name) // Will not be reactive!
      })
    }
  }
  ```

  在开发过程中，`props` 对象对于用户区代码是不可变的（如果用户代码尝试对其进行更改，则会发出警告）。

  第二个参数提供了一个上下文对象，该对象公开了先前在2.x API中暴露在 `this` 的选择性列表：

  ```js
  const MyComponent = {
    setup(props, context) {
      context.attrs
      context.slots
      context.emit
    }
  }
  ```

  `attrs` 和 `slot` 是内部组件实例上相应值的代理。这可以确保即使在更新后它们也始终显示最新值，以便我们可以对它们进行结构分解，而不必担心访问陈旧的引用：

  ```js
  const MyComponent = {
    setup(props, { attrs }) {
      // a function that may get called at a later stage
      function onClick() {
        console.log(attrs.foo) // guaranteed to be the latest reference
      }
    }
  }
  ```

  有很多理由将 `props` 放置为单独的第一个参数，而不是将其包含在上下文中：

  - 组件使用 `props` 比其他属性更常见，并且很多情况下组件仅使用 `props`。

  - 将 `props` 作为单独的参数，可以更轻松地单独键入它（请参见下面的 [仅TypeScript的Props Typing](#typescript-only-props-typing)），而不会弄乱上下文中其他属性的类型。它还可以通过TSX支持在 `setup`，`render` 和普通函数组件之间保持一致的签名。
 
- **`this` 的用法**

  **`this` 在 `setup()` 里面是不可取的.** 由于 `setup()` 是在解析2.x选项之前调用的，因此 `setup()` 内部（如果可用）的行为将与其他2.x选项完全不同。将 `setup()` 与其他2.x选项一起使用时，使其可用可能会引起混乱。在 `setup()` 中避免这种情况的另一个原因是对于初学者来说非常常见的陷阱：

  ```js
  setup() {
    function onClick() {
      this // not the `this` you'd expect!
    }
  }
  ```

- **类型**

  ```ts
  interface Data {
    [key: string]: unknown
  }

  interface SetupContext {
    attrs: Data
    slots: Slots
    emit: (event: string, ...args: unknown[]) => void
  }

  function setup(props: Data, context: SetupContext): Data
  ```

  ::: tip
  为了获得传递给 `setup()` 的参数的类型推断，需要使用 `defineComponent`。
  :::

## Reactivity APIs

### `reactive`

Takes an object and returns a reactive proxy of the original. This is equivalent to 2.x's `Vue.observable()`.

取得一个对象并返回响应式的原始的proxy。这等效于2.x的 `Vue.observable()`。

```js
const obj = reactive({ count: 0 })
```

响应式转换是“深度”的：它影响所有嵌套的属性。在基于ES2015代理的实现中，返回的proxy不等于原始对象。建议仅与响应式proxy一起使用，并避免依赖原始对象。

- **类型**

  ```ts
  function reactive<T extends object>(raw: T): T
  ```

### `ref`

接受一个内部值并返回一个响应式且可变的ref对象。ref对象具有指向内部值的单个属性 `.value`。

```js
const count = ref(0)
console.log(count.value) // 0

count.value++
console.log(count.value) // 1
```

如果将一个对象分配为ref的值，则该对象将通过 `reactive` 方法进行深度响应式。

- **模板访问**

  当ref作为渲染上下文（从 `setup()` 返回的对象）上的属性返回并在模板中进行访问时，它会自动解包为内部值。无需在模板中附加 `.value`：

  ```html
  <template>
    <div>{{ count }}</div>
  </template>

  <script>
    export default {
      setup() {
        return {
          count: ref(0)
        }
      }
    }
  </script>
  ```

- **访问 Reactive Objects**

  当ref被访问或作为 reactive 对象的属性进行更改时，它会自动展开为内部值，因此其行为类似于普通属性：

  ```js
  const count = ref(0)
  const state = reactive({
    count
  })

  console.log(state.count) // 0

  state.count = 1
  console.log(count.value) // 1
  ```

  请注意，如果将新的引用分配给链接到现有引用的属性，它将替换旧的引用：

  ```js
  const otherCount = ref(2)

  state.count = otherCount
  console.log(state.count) // 2
  console.log(count.value) // 1
  ```

  请注意，只有当嵌套在 reactive `object`  中时，才会进行引用解包。从数组或原生集合类型（如Map）访问ref时，不执行解包：

  ```js
  const arr = reactive([ref(0)])
  // need .value here
  console.log(arr[0].value)

  const map = reactive(new Map([['foo', ref(0)]]))
  // need .value here
  console.log(map.get('foo').value)
  ```

- **类型**

  ```ts
  interface Ref<T> {
    value: T
  }

  function ref<T>(value: T): Ref<T>
  ```

  有时我们可能需要为ref的内部值指定复杂类型。我们可以通过在调用 `ref` 覆盖默认推断时传递泛型参数来简洁地实现此目的：

  ```ts
  const foo = ref<string | number>('foo') // foo's type: Ref<string | number>

  foo.value = 123 // ok!
  ```

### `computed`

使用getter函数，并为getter返回的值返回一个不变的 reactive ref 对象。

```js
const count = ref(1)
const plusOne = computed(() => count.value + 1)

console.log(plusOne.value) // 2

plusOne.value++ // error
```

或者，它可以使用具有 `get` 和 `set` 函数的对象来创建可写的ref对象。

```js
const count = ref(1)
const plusOne = computed({
  get: () => count.value + 1,
  set: val => {
    count.value = val - 1
  }
})

plusOne.value = 1
console.log(count.value) // 0
```

- **类型**

  ```ts
  // read-only
  function computed<T>(getter: () => T): Readonly<Ref<Readonly<T>>>

  // writable
  function computed<T>(options: {
    get: () => T
    set: (value: T) => void
  }): Ref<T>
  ```

### `readonly`

取得一个对象（reactive或普通）或ref，并返回一个只读 proxy 到原始对象。只读 proxy 很深：访问的任何嵌套属性也将是只读的。

```js
const original = reactive({ count: 0 })

const copy = readonly(original)

watchEffect(() => {
  // works for reactivity tracking
  console.log(copy.count)
})

// mutating original will trigger watchers relying on the copy
original.count++

// mutating the copy will fail and result in a warning
copy.count++ // warning!
```

### `watchEffect`

在 reactive 跟踪其依赖关系时立即运行一个函数，并在依赖关系发生变化时重新运行它。

```js
const count = ref(0)

watchEffect(() => console.log(count.value))
// -> logs 0

setTimeout(() => {
  count.value++
  // -> logs 1
}, 100)
```

#### 停止观察者

在组件的 `setup()` 函数或生命周期挂钩期间调用 `watchEffect` 时，观察程序将链接到该组件的生命周期，并且在卸载该组件时将自动停止。

在其他情况下，它返回停止句柄，可以调用该句柄以显式停止观察程序：

```js
const stop = watchEffect(() => {
  /* ... */
})

// later
stop()
```

#### 副作用无效

有时，受监视的效果函数会执行异步副作用，当无效时需要对其进行清理（即在完成效果之前更改状态）。效果函数接收一个 `onInvalidate` 函数，该函数可用于注册无效回调。在以下情况下调用无效回调：

- effect 将重新运行
- 观察者停止（即，在卸载组件时如果在 `setup()` 或生命周期挂钩中使用 `watchEffect`）

```js
watchEffect(onInvalidate => {
  const token = performAsyncOperation(id.value)
  onInvalidate(() => {
    // id has changed or watcher is stopped.
    // invalidate previously pending async operation
    token.cancel()
  })
})
```

我们正在通过传递的函数注册无效回调，而不是从回调（如React `useEffect`）返回它，因为返回值对于异步错误处理很重要。在执行数据提取时，副作用函数通常是异步函数：

```js
const data = ref(null)
watchEffect(async () => {
  data.value = await fetchData(props.id)
})
```

异步函数隐式返回Promise，但是在Promise解析之前，必须立即注册清除函数。此外，Vue依靠返回的Promise来自动处理Promise链中的潜在错误。

#### 副作用冲洗时机

Vue的反应系统缓冲无效的效果，并异步刷新它们，以避免在同一“tick”中发生许多状态突变时不必要的重复调用。在内部，组件的更新功能也是受监视的效果。当用户效果排队时，总是在所有组件更新效果之后调用它：

```html
<template>
  <div>{{ count }}</div>
</template>

<script>
  export default {
    setup() {
      const count = ref(0)

      watchEffect(() => {
        console.log(count.value)
      })

      return {
        count
      }
    }
  }
</script>
```

在此示例中：

- 该计数将在初始运行时同步记录。
- 更改 `count` 时，将在组件更新后调用回调。

请注意，第一次运行是在挂载组件之前执行的。因此，如果您希望以监视的效果访问DOM（或模板引用），请在 mounted 的钩子中进行操作：

```js
onMounted(() => {
  watchEffect(() => {
    // access the DOM or template refs
  })
})
```

如果需要同步运行观察者效果或在组件更新之前重新运行，我们可以传递带有 `flush` 选项的附加options对象（默认为 `'post'`）：

```js
// fire synchronously
watchEffect(
  () => {
    /* ... */
  },
  {
    flush: 'sync'
  }
)

// fire before component updates
watchEffect(
  () => {
    /* ... */
  },
  {
    flush: 'pre'
  }
)
```

#### Watcher 调试

`onTrack` 和 `onTrigger` 选项可用于调试观察者的行为。

- 当将 reactive 属性或引用作为依赖项进行跟踪时，将调用 `onTrack`
- 当 watcher 回调由依赖项的突变触发时，将调用 `onTrigger`

这两个回调都将接收到一个调试器事件，该事件包含有关所依赖项的信息。建议在以下回调中放置 `debugger` 语句，以交互方式检查依赖关系：

```js
watchEffect(
  () => {
    /* side effect */
  },
  {
    onTrigger(e) {
      debugger
    }
  }
)
```

`onTrack` 和 `onTrigger` 仅在开发模式下工作。

- **Typing**

  ```ts
  function watchEffect(
    effect: (onInvalidate: InvalidateCbRegistrator) => void,
    options?: WatchEffectOptions
  ): StopHandle

  interface WatchEffectOptions {
    flush?: 'pre' | 'post' | 'sync'
    onTrack?: (event: DebuggerEvent) => void
    onTrigger?: (event: DebuggerEvent) => void
  }

  interface DebuggerEvent {
    effect: ReactiveEffect
    target: any
    type: OperationTypes
    key: string | symbol | undefined
  }

  type InvalidateCbRegistrator = (invalidate: () => void) => void

  type StopHandle = () => void
  ```

### `watch`

`watch` API与2.x `this.$ watch`（以及相应的 `watch` 选项）完全等效。`watch` 需要监视特定的数据源，并在单独的回调函数中应用副作用。默认情况下，它也是惰性的-也就是说，仅在监视的源已更改时才调用回调。

- 与 `watchEffect` 相比，`watch` 使我们能够：

  - 懒惰地执行副作用；
  - 更具体地说明应触发观察程序重新运行的状态；
  - 访问监视状态的先前值和当前值。

- **观察单一来源**

  观察者数据源可以是返回值的getter函数，也可以直接是ref：

  ```js
  // watching a getter
  const state = reactive({ count: 0 })
  watch(
    () => state.count,
    (count, prevCount) => {
      /* ... */
    }
  )

  // directly watching a ref
  const count = ref(0)
  watch(count, (count, prevCount) => {
    /* ... */
  })
  ```

- **观察多个来源**

  观察者还可以使用数组同时监视多个源：

  ```js
  watch([fooRef, barRef], ([foo, bar], [prevFoo, prevBar]) => {
    /* ... */
  })
  ```

* **与 `watchEffect` 共享的行为**

  `watch` 在 [手动停止](#stopping-the-watcher)，[副作用无效](#side-effect-invalidation)（将 `onInvalidate` 作为第三个参数传递给回调）方面与 `watchEffect` 共享行为，[刷新计时](#effect-flush-timing) 和 [调试](#watcher-debugging)。

* **Typing**

  ```ts
  // wacthing single source
  function watch<T>(
    source: WatcherSource<T>,
    callback: (
      value: T,
      oldValue: T,
      onInvalidate: InvalidateCbRegistrator
    ) => void,
    options?: WatchOptions
  ): StopHandle

  // watching multiple sources
  function watch<T extends WatcherSource<unknown>[]>(
    sources: T
    callback: (
      values: MapSources<T>,
      oldValues: MapSources<T>,
      onInvalidate: InvalidateCbRegistrator
    ) => void,
    options? : WatchOptions
  ): StopHandle

  type WatcherSource<T> = Ref<T> | (() => T)

  type MapSources<T> = {
    [K in keyof T]: T[K] extends WatcherSource<infer V> ? V : never
  }

  // see `watchEffect` typing for shared options
  interface WatchOptions extends WatchEffectOptions {
    immediate?: boolean // default: false
    deep?: boolean
  }
  ```

## 生命周期钩子

可以使用直接导入的 `onXXX` 函数注册生命周期挂钩：

```js
import { onMounted, onUpdated, onUnmounted } from 'vue'

const MyComponent = {
  setup() {
    onMounted(() => {
      console.log('mounted!')
    })
    onUpdated(() => {
      console.log('updated!')
    })
    onUnmounted(() => {
      console.log('unmounted!')
    })
  }
}
```

这些生命周期挂钩注册函数只能在 `setup()` 期间同步使用，因为它们依赖于内部全局状态来定位当前的活动实例（当前正在调用 `setup()` 的组件实例）。在没有当前活动实例的情况下调用它们将导致错误。

组件实例上下文也是在生命周期挂钩的同步执行期间设置的，因此，在卸载组件时，在生命周期挂钩内部同步创建的观察者和计算属性也将自动删除。

- **2.x生命周期选项和Composition API之间的映射**

  - ~~`beforeCreate`~~ -> use `setup()`
  - ~~`created`~~ -> use `setup()`
  - `beforeMount` -> `onBeforeMount`
  - `mounted` -> `onMounted`
  - `beforeUpdate` -> `onBeforeUpdate`
  - `updated` -> `onUpdated`
  - `beforeDestroy` -> `onBeforeUnmount`
  - `destroyed` -> `onUnmounted`
  - `errorCaptured` -> `onErrorCaptured`

- **新钩子**

  除了2.x生命周期等效项之外，Composition API还提供了以下调试挂钩：

  - `onRenderTracked`
  - `onRenderTriggered`

  两个钩子都收到一个 `DebuggerEvent`，类似于观察者的 `onTrack` 和 `onTrigger` 选项：

  ```js
  export default {
    onRenderTriggered(e) {
      debugger
      // inspect which dependency is causing the component to re-render
    }
  }
  ```

## 依赖注入

`provide` 和 `inject`启用依赖项注入，类似于2.x `provide/inject` 选项。两者都只能在 `setup()` 中使用当前活动实例进行调用。

```js
import { provide, inject } from 'vue'

const ThemeSymbol = Symbol()

const Ancestor = {
  setup() {
    provide(ThemeSymbol, 'dark')
  }
}

const Descendent = {
  setup() {
    const theme = inject(ThemeSymbol, 'light' /* optional default value */)
    return {
      theme
    }
  }
}
```

`inject` 接受一个可选的默认值作为第二个参数。如果未提供默认值，并且在提供上下文中未找到该属性，则 `inject` 返回 `undefined`。

- **注入 Reactivity**

  为了保持提供的值和注入的值之间的反应性，可以使用ref：

  ```js
  // in provider
  const themeRef = ref('dark')
  provide(ThemeSymbol, themeRef)

  // in consumer
  const theme = inject(ThemeSymbol, ref('light'))
  watchEffect(() => {
    console.log(`theme set to: ${theme.value}`)
  })
  ```

  如果注入了 reactive 物体，也可以进行 reactive 观察。

- **Typing**

  ```ts
  interface InjectionKey<T> extends Symbol {}

  function provide<T>(key: InjectionKey<T> | string, value: T): void

  // without default value
  function inject<T>(key: InjectionKey<T> | string): T | undefined
  // with default value
  function inject<T>(key: InjectionKey<T> | string, defaultValue: T): T
  ```

  Vue提供了 `InjectionKey` 接口，它是扩展 `Symbol` 的通用类型。它可用于在提供者和使用者之间同步注入值的类型：

  ```ts
  import { InjectionKey, provide, inject } from 'vue'

  const key: InjectionKey<string> = Symbol()

  provide(key, 'foo') // providing non-string value will result in error

  const foo = inject(key) // type of foo: string | undefined
  ```

  如果使用字符串键或非类型符号，则需要显式声明注入值的类型：

  ```ts
  const foo = inject<string>('foo') // string | undefined
  ```

## Template Refs

使用Composition API时，reactive refs 和 template refs 的概念是统一的。为了获得对模板内元素或组件实例的引用，我们可以像往常一样声明ref并从 `setup()` 返回它：

```html
<template>
  <div ref="root"></div>
</template>

<script>
  import { ref, onMounted } from 'vue'

  export default {
    setup() {
      const root = ref(null)

      onMounted(() => {
        // the DOM element will be assigned to the ref after initial render
        console.log(root.value) // <div/>
      })

      return {
        root
      }
    }
  }
</script>
```

在这里，我们将 `root` 暴露在渲染上下文中，并将其通过 `ref="root"` 作为ref绑定到div。在虚拟DOM更新算法中，如果VNode的ref键对应于渲染上下文中的ref，则将VNode的对应元素或组件实例分配给该ref的值。这是在虚拟DOM挂载/更新过程中执行的，因此模板引用将仅在初始渲染后获得分配的值。

用作模板ref的ref的行为与其他任何ref一样：它们是反应性的，可以传递到组合函数中（或从中返回）。

- **渲染函数/JSX的用法**

  ```js
  export default {
    setup() {
      const root = ref(null)

      return () =>
        h('div', {
          ref: root
        })

      // with JSX
      return () => <div ref={root} />
    }
  }
  ```

- **`v-for` 内部的用法**

  在 `v-for` 中使用时，Composition API模板引用没有特殊处理。而是使用函数refs（3.0中的新功能）执行自定义处理：

  ```html
  <template>
    <div v-for="(item, i) in list" :ref="el => { divs[i] = el }">
      {{ item }}
    </div>
  </template>

  <script>
    import { ref, reactive, onBeforeUpdate } from 'vue'

    export default {
      setup() {
        const list = reactive([1, 2, 3])
        const divs = ref([])

        // make sure to reset the refs before each update
        onBeforeUpdate(() => {
          divs.value = []
        })

        return {
          list,
          divs
        }
      }
    }
  </script>
  ```

## Reactivity Utilities

### `unref`

如果参数是引用，则返回内部值，否则返回参数本身。这是 `val = isRef(val) ? val.value : val` 的语法糖函数

```js
function useFoo(x: number | Ref<number>) {
  const unwrapped = unref(x) // unwrapped is guaranteed to be number now
}
```

### `toRef`

`toRef` 可用于为源 reactive 对象上的属性创建引用。然后，可以将ref传递给周围，并保留与其源属性的 reactive 连接。

```js
const state = reactive({
  foo: 1,
  bar: 2
})

const fooRef = toRef(state, 'foo')

fooRef.value++
console.log(state.foo) // 2

state.foo++
console.log(fooRef.value) // 3
```

当您要将prop的ref传递给composition函数时，`toRef` 很有用：

```js
export default {
  setup(props) {
    useSomeFeature(toRef(props, 'foo'))
  }
}
```

### `toRefs`

将 reactive 对象转换为普通对象，其中结果对象上的每个属性都是指向原始对象中相应属性的ref。

```js
const state = reactive({
  foo: 1,
  bar: 2
})

const stateAsRefs = toRefs(state)
/*
Type of stateAsRefs:

{
  foo: Ref<number>,
  bar: Ref<number>
}
*/

// The ref and the original property is "linked"
state.foo++
console.log(stateAsRefs.foo) // 2

stateAsRefs.foo.value++
console.log(state.foo) // 3
```

从组合函数返回 reactive 对象时，`toRefs` 很有用，以便使用组件可以分解/散布返回的对象而不会失去 reactive 性：

```js
function useFeatureX() {
  const state = reactive({
    foo: 1,
    bar: 2
  })

  // logic operating on state

  // convert to refs when returning
  return toRefs(state)
}

export default {
  setup() {
    // can destructure without losing reactivity
    const { foo, bar } = useFeatureX()

    return {
      foo,
      bar
    }
  }
}
```

### `isRef`

检查值是否是 ref 对象。

### `isProxy`

检查对象是通过 `reactive` 还是 `readonly` 创建的代理。

### `isReactive`

检查对象是否是由 `reactive` 的 reactive 的 proxy。

如果 proxy 是由 `readonly` 创建的，但是包装了由 `reactive` 创建的另一个 proxy，则它也返回true。

### `isReadonly`

检查对象是否是由 `readonly` 创建的只读的 proxy。

## Advanced Reactivity APIs

### `customRef`

创建一个具有明确控制其依赖项跟踪和更新触发的自定义引用。期望工厂功能。工厂函数接收 `track` 和 `trigger` 函数作为参数，并应返回带有 `get` 和 `set` 的对象。

- 使用自定义ref通过 `v-model` 实现去抖动的示例：

  ```html
  <input v-model="text" />
  ```
  ```js
  function useDebouncedRef(value, delay = 200) {
    let timeout
    return customRef((track, trigger) => {
      return {
        get() {
          track()
          return value
        },
        set(newValue) {
          clearTimeout(timeout)
          timeout = setTimeout(() => {
            value = newValue
            trigger()
          }, delay)
        }
      }
    })
  }

  export default {
    setup() {
      return {
        text: useDebouncedRef('hello')
      }
    }
  }
  ```

- **Typing**

  ```ts
  function customRef<T>(factory: CustomRefFactory<T>): Ref<T>

  type CustomRefFactory<T> = (
    track: () => void,
    trigger: () => void
  ) => {
    get: () => T
    set: (value: T) => void
  }
  ```

### `markRaw`

标记一个对象，使其永远不会转换为 proxy。返回对象本身。

```js
const foo = markRaw({})
console.log(isReactive(reactive(foo))) // false

// also works when nested inside other reactive objects
const bar = reactive({ foo })
console.log(isReactive(bar.foo)) // false
```

::: warning
借助 `markRaw` 和下面的shallowXXX API，您可以有选择地选择退出默认的深度响应/只读转换，并将原始的，非代理的对象嵌入状态图中。出于各种原因可以使用它们：

- 根本就不应使某些值具有反应性，例如，复杂的第三方类实例或Vue组件对象。

- 渲染具有不可变数据源的大列表时，跳过代理转换可以提高性能。

它们被认为是高级的，因为原始选择退出仅在根级别，因此，如果将嵌套的，未标记的原始对象设置为反应对象，然后再次访问它，则可以得到代理版本。这可能导致身份危害-即执行依赖于对象身份的操作，但同时使用同一对象的原始版本和代理版本：

```js
const foo = markRaw({
  nested: {}
})

const bar = reactive({
  // although `foo` is marked as raw, foo.nested is not.
  nested: foo.nested
})

console.log(foo.nested === bar.nested) // false
```

身份危害通常很少见。但是要在安全地避免身份隐患的同时正确利用这些API，需要对反应系统的工作原理有深入的了解。
:::

### `shallowReactive`

创建一个反应式代理，以跟踪其自身属性的反应性，但不执行嵌套对象的深度反应式转换（公开原始值）。

```js
const state = shallowReactive({
  foo: 1,
  nested: {
    bar: 2
  }
})

// mutating state's own properties is reactive
state.foo++
// ...but does not convert nested objects
isReactive(state.nested) // false
state.nested.bar++ // non-reactive
```

### `shallowReadonly`

创建一个代理，使其自身的属性为只读，但不执行嵌套对象的深度只读转换（公开原始值）。

```js
const state = shallowReadonly({
  foo: 1,
  nested: {
    bar: 2
  }
})

// mutating state's own properties will fail
state.foo++
// ...but works on nested objects
isReadonly(state.nested) // false
state.nested.bar++ // works
```

### `shallowRef`

创建一个 ref 来跟踪其自身的 `.value` 突变，但不会使其值具有反应性。

```js
const foo = shallowRef({})
// mutating the ref's value is reactive
foo.value = {}
// but the value will not be converted.
isReactive(foo.value) // false
```

### `toRaw`

返回 `reactive` 或者 `readonly` proxy的原始对象。这是一个转义口，可用于临时读取而不会产生代理访问/跟踪开销，或者可用于写入而不会触发更改。不建议保留对原始对象的持久引用。请谨慎使用。

```js
const foo = {}
const reactiveFoo = reactive(foo)

console.log(toRaw(reactiveFoo) === foo) // true
```
