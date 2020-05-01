# 逻辑提取和重用

当涉及跨组件提取和重用逻辑时，Composition API非常灵活。合成函数不再依赖神奇的 ```this``` 上下文，而仅依赖于其参数和全局导入的Vue API。你可以通过简单地将其导出为函数来重用组件逻辑的任何部分。你甚至可以通过导出组件整个 ```setup``` 函数达到 ```extends``` 等效功能。

让我们看一个例子：跟踪鼠标的位置。

```js
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

```js
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

* 渲染上下文中公开的属性的来源不清楚。例如，当使用多个mixin读取组件的模板时，可能很难确定从哪个mixin注入了特定的属性。
* 命名空间冲突。Mixins可能会在属性和方法名称上发生冲突，而HOC可能会在预期的prop名称上发生冲突。
* 性能。HOC和无渲染组件需要额外的有状态组件实例，这会降低性能。

相比之下，使用Composition API：

* 暴露给模板的属性具有明确的来源，因为它们是从合成函数返回的值。
* 合成函数返回的值可以任意命名，因此不会发生名称空间冲突。
* 没有创建仅用于逻辑重用的不必要的组件实例。


