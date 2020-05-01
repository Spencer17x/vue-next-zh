# 更大的灵活性需要更多的纪律

许多用户指出，尽管Composition API在代码组织方面提供了更大的灵活性，但它也需要开发人员更多的纪律才能“正确执行”。有些人担心该API会导致经验不足的意大利面条式代码。换句话说，尽管Composition API提高了代码质量的上限，但同时也降低了代码质量的下限。

我们在一定程度上同意这一点。但是，我们认为：

1. 上限的收益远大于下限的损失。
2. 通过适当的文档和社区指导，我们可以有效地解决代码组织问题。

一些用户使用Angular 1控制器作为设计可能导致编写不良代码的示例。Composition API和Angular 1控制器之间的最大区别是，它不依赖于共享范围上下文。这使得将逻辑分成单独的功能变得非常容易，这是JavaScript代码组织的核心机制。

任何JavaScript程序都以入口文件开头（可以将其视为程序的 ```setup()```）。我们根据逻辑关注点将程序分为功能和模块来组织程序。Composition API使我们能够对Vue组件代码执行相同的操作。换句话说，使用Composition API时，编写井井有条的JavaScript代码的技能会直接转化为编写井井有条的Vue代码的技能。