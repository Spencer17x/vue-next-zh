# 与Svelte的比较

尽管采用的路线截然不同，但是Composition API和Svelte 3的基于编译器的方法实际上在概念上有很多共通之处。这是一个并行的示例：

**Vue**

```html
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

**Svelte**

```html
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

* 将整个 ```<script>``` 块（import语句除外）隐式包装到为每个组件实例调用的函数中（而不是仅执行一次）
* 隐式注册对可变突变的反应性
* 隐式地将所有作用域内的变量暴露给渲染上下文
* 将 ```$``` 语句编译为重新执行的代码

从技术上讲，我们可以在Vue中做同样的事情（可以通过userland Babel插件来完成）。我们不这样做的主要原因是与标准JavaScript保持一致。如果您从Vue文件的 ```<script>``` 块中提取代码，我们希望它的工作原理与标准ES模块完全相同。另一方面，Svelte ```<script>``` 块中的代码在技术上不再是标准JavaScript。这种基于编译器的方法存在很多问题：

1. 无论是否编译，代码的工作方式都不同。作为一个渐进式框架，许多Vue用户可能希望/需要/必须在没有构建设置的情况下使用它，因此，编译后的版本不能成为默认版本。另一方面，Svelte将自身定位为编译器，并且只能与构建步骤一起使用。这是两个框架在有意识地做出的折衷。
2. 代码在内部/外部组件中的工作方式不同。当试图将逻辑从Svelte组件中提取到标准JavaScript文件中时，我们将失去神奇的简洁语法，而不得不使用 [更为冗长的低级API](https://svelte.dev/docs#svelte_store)。
3. Svelte的反应性编译仅适用于顶级变量-它不涉及在函数内部声明的变量，因此我们 [无法在组件内部声明的函数中封装反应性状态](https://svelte.dev/repl/4b000d682c0548e79697ddffaeb757a3?version=3.6.2)。这对具有功能的代码组织施加了不小的限制-正如我们在RFC中所展示的那样，这对于保持大型组件的可维护性非常重要。
4. [非标准语义使与TypeScript集成成为问题。](https://github.com/sveltejs/svelte/issues/1639)

这绝不是说Svelte 3是一个坏主意-实际上，这是一种非常创新的方法，我们非常尊重Rich的工作。但是基于Vue的设计约束和目标，我们必须做出不同的权衡。
