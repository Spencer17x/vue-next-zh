# 类API的类型问题

引入类API的主要目的是提供一种具有更好TypeScript推理支持的替代API。但是，Vue组件需要将从多个源声明的属性合并到一个单独的 ```this``` 上下文中，即使使用基于Class的API也会带来一些挑战。

一个例子是 props。为了合并 props 到 ```this```，我们必须对组件类使用通用参数，或者使用装饰器。

这是使用通用参数的示例：

```js
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

```js
class App extends Component<Props> {
  @prop message: string
}
```

使用装饰器会产生对第二阶段规范的依赖，存在很多不确定性，尤其是当TypeScript的当前实现与TC39提案完全不同步时。此外，无法在 ```this.$props``` 上公开用装饰器声明的 props 类型，这会破坏TSX的支持。用户还可以假设他们可以通过 ```@prop message: string = 'foo'``` 声明prop的默认值，从技术上讲，它不能按预期工作。

另外，当前没有办法利用上下文类型作为类方法的参数-这意味着传递给Class的 ```render``` 函数的参数不能基于Class的其他属性来推断类型。

