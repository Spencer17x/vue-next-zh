module.exports = {
	title: 'Vue Composition API',
	description: 'Just playing around',
	base: '/vue_next_zh/',
	themeConfig: {
		nav: [
			{ text: 'RFC  ', link: '/' },
			{ text: 'API Reference', link: 'https://composition-api.vuejs.org/api.html' },
		],
		sidebar: [
			{
				title: 'Composition API RFC',   // 必要的
				collapsable: false, // 可选的, 默认值是 true,
				sidebarDepth: 1,    // 可选的, 默认值是 1
				children: [
					['/summary/', '摘要'],
					['/basic-example/', '基本例子'],
					{
						title: '动机',
						path: '/motivation/',
						collapsable: false,
						sidebarDepth: 2,
						children: [
							['/logic-reuse-code-organization/', '逻辑重用和代码组织'],
							['/better-type-inference/', '更好的类型推断']
						]
					},
					{
						title: '详细设计',
						path: '/detailed-design/',
						collapsable: false, sidebarDepth: 2,
						children: [
							['/api-introduction/', 'API介绍'],
							['/code-organization/', '代码组织'],
							['/logic-extraction-and-reuse/', '逻辑提取和重用'],
							['/usage-alongside-existing-api/', '现有API的用法'],
							['/plugin-development/', '插件开发'],
						]
					},
					{
						title: '缺点',
						path: '/drawbacks/',
						collapsable: false,
						sidebarDepth: 2,
						children: [
							['/overhead-of-introducing-refs/', '介绍引用的开销'],
							['/ref-vs-reactive/', 'Ref vs. Reactive'],
							['/verbosity-of-the-return-statement/', '退货声明的详细程度'],
							['/more-flexibility-requires-more-discipline/', '更大的灵活性需要更多的纪律'],
						]
					},
					['/adoption-strategy/', '采纳策略'],
					{
						title: '附录',
						path: '/appendix/',
						collapsable: false,
						sidebarDepth: 2,
						children: [
							['/type-issues-with-class-api/', '类API的类型问题'],
							['/comparison-with-react-hooks/', '与React Hooks的比较'],
							['/comparison-with-svelte/', '与Svelte的比较'],
						]
					}
				]
			},
		]
	}
};
