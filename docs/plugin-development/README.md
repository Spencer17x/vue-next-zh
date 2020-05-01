# 插件开发

如今，许多Vue插件都在 ```this``` 上注入了属性。例如，Vue Router注入 ```this.$route``` 和 ```this.$route```，而Vuex注入 ```this.$store```。由于每个插件都要求用户增加注入属性的Vue类型，这使得类型推断变得棘手。

使用合成API时，没有 ```this```。相反，插件将利用内部 [```provide``` 和 ```inject```](/api/#dependency-injection) 并公开组合功能。以下是插件的假设代码：

```js
const StoreSymbol = Symbol()

export function provideStore(store) {
  provide(StoreSymbol, store)
}

export function useStore() {
  const store = inject(StoreSymbol)
  if (!store) {
    // 抛出错误，未提供存储
  }
  return store
}
```

并在使用代码中：

```js
// 在组件根目录提供存储
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
