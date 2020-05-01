# 代码组织

至此，我们已经使用导入的函数复制了组件API，但是该做什么呢？用选项定义组件似乎要比将所有函数混合在一起来使函数更有组织性！

这是可以理解的第一印象。但是，正如动机部分所述，我们认为Composition API实际上可以带来更好的组织代码，尤其是在复杂的组件中。在这里，我们将尝试解释原因。

#### 什么是“组织机构代码”？

让我们退后一步，考虑当我们谈论“组织代码”时的真正含义。保持代码井井有条的最终目的应该是使代码更易于阅读和理解。“理解”代码是什么意思？我们真的可以仅仅因为知道组件包含哪些选项而声称自己“了解”了组件吗？您是否遇到过由另一个开发人员（例如，[这个](https://github.com/vuejs/vue-cli/blob/a09407dd5b9f18ace7501ddb603b95e31d6d93c0/packages/@vue/cli-ui/src/components/folder/FolderExplorer.vue#L198-L404)）创作的大型组件，并且很难将头放在该组件上？

想一想我们将如何引导同一个开发人员通过一个大型组件，如上面链接的组件。您很可能从“此组件正在处理X，Y和Z”开始，而不是“此组件具有这些数据属性，这些计算的属性和这些方法”。在理解组件时，我们更关心“组件正在尝试做什么”（即代码背后的意图），而不是“组件碰巧使用了哪些选项”。虽然使用基于选项的API编写的代码自然可以回答后者，但在表达前者方面做得相当差。

#### 逻辑问题与选项类型

让我们将组件要处理的“ X，Y和Z”定义为逻辑问题。小型单一用途的组件通常不存在可读性问题，因为整个组件只处理一个逻辑问题。但是，在高级用例中，这个问题变得更加突出。以 [Vue CLI UI](https://github.com/vuejs/vue-cli/blob/a09407dd5b9f18ace7501ddb603b95e31d6d93c0/packages/@vue/cli-ui/src/components/folder/FolderExplorer.vue#L198-L404) 文件浏览器为例。该组件必须处理许多不同的逻辑问题：

* 跟踪当前文件夹状态并显示其内容
* 处理文件夹导航（打开，关闭，刷新...）
* 处理新文件夹的创建
* 仅切换显示收藏夹
* 切换显示隐藏文件夹
* 处理当前工作目录更改

您是否可以通过阅读基于选项的代码立即识别并区分这些逻辑问题？这肯定是困难的。您会注意到，与特定逻辑问题相关的代码通常会分散在各处。例如，“创建新文件夹”功能使用了 [两个数据属性](https://github.com/vuejs/vue-cli/blob/a09407dd5b9f18ace7501ddb603b95e31d6d93c0/packages/@vue/cli-ui/src/components/folder/FolderExplorer.vue#L221-L222)，[一个计算属性](https://github.com/vuejs/vue-cli/blob/a09407dd5b9f18ace7501ddb603b95e31d6d93c0/packages/@vue/cli-ui/src/components/folder/FolderExplorer.vue#L240) 和 [一个方法](https://github.com/vuejs/vue-cli/blob/a09407dd5b9f18ace7501ddb603b95e31d6d93c0/packages/@vue/cli-ui/src/components/folder/FolderExplorer.vue#L387)-其中在距数据属性一百行的位置定义了该方法。

如果我们对这些逻辑问题中的每一个进行彩色编码，我们会注意到在使用组件选项表示它们时有多分散：

![](https://user-images.githubusercontent.com/499550/62783021-7ce24400-ba89-11e9-9dd3-36f4f6b1fae2.png)

正是这种碎片化使得难以理解和维护复杂的组件。通过选项的强制分隔使基本的逻辑问题变得模糊。另外，当处理单个逻辑关注点时，我们必须不断地“跳动”选项块，以查找与该关注点相关的部分。

> 注意：原始代码可能会在一些地方得到改进，但是我们正在展示最新提交（在撰写本文时），而没有进行修改，以提供我们自己编写的实际生产代码示例。

如果我们可以并置与同一逻辑问题相关的代码，那就更好了。这正是Composition API使我们能够执行的操作。可以通过以下方式编写“创建新文件夹”功能：

```js
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

![](https://user-images.githubusercontent.com/499550/62783026-810e6180-ba89-11e9-8774-e7771c8095d6.png)

> 此比较不包括 import 语句和 ```setup()``` 函数。可以在 [此处](https://gist.github.com/yyx990803/8854f8f6a97631576c14b63c8acd8f2e) 找到使用Composition API重新实现的完整组件。

现在，每个逻辑关注点的代码在组合函数中并置在一起。当在大型组件上工作时，这大大减少了对恒定“跳跃”的需求。合成功能也可以在编辑器中折叠，以使组件更易于扫描：

```js
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

```js
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


