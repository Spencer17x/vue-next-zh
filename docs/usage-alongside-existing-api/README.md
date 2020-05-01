# 现有API的用法

Composition API可以与现有的基于 options 的API一起使用。

* Composition API在2.x options（```data```，```computed``` 和 ```methods```）之前已解决，并且无法访问由这些选项定义的属性。
* 从 ```setup()``` 返回的属性将会暴露给 ```this```，并且可以在2.x options 中访问。

