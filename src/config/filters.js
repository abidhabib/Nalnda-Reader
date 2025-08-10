import { GENRES } from "./genres"

export const EXPLORE_PAGE_FILTERS = [
    { name: "price", label:"Price", type: "range", min: 0, max: 100, step: 10, unit:"USDC" },
    {
        name: "genres",
        label: "Genres",
        type: "multiselect",
        values: GENRES.map(genre => ({label:genre,value:genre}))
    },
	{
		name: "age_group",
		label: "Age Groups",
		type: "multiselect",
		values: [
			{value: "Children (0-14 years)", label: "Children (0-14 years)"},
			{value: "Youth (15-24 years)", label: "Youth (15-24 years)"},
			{value: "Adults (25-64 years)", label: "Adults (25-64 years)"},
			{value: "Seniors 65+", label: "Seniors 65+"},
			
		],
	},
    {
        name: "orderby",
        label: "Order By",
        type: "select",
        values: [
            {value:"PRICE_L_H",label:"Price - Low to High"},
            {value:"PRICE_H_L",label:"Price - High to Low"},
            {value:"RATING_L_H",label:"Rating - Low to Hight"},
            {value:"RATING_H_L",label:"Rating - High to Low"},
        ],
    }
]


export const ACCOUNT_PAGE_FILTERS = [
    { name: "price", label:"Price", type: "range", min: 0, max: 100, step: 10, unit:"USDC" },
    {
        name: "genres",
        label: "Genres",
        type: "multiselect",
        values:  GENRES.map(genre => ({label:genre,value:genre})),
    },
	{
        name: "age_group",
        label: "Age Groups",
        type: "multiselect",
        values: [
			{value: "Children (0-14 years)", label: "Children (0-14 years)"},
			{value: "Youth (15-24 years)", label: "Youth (15-24 years)"},
			{value: "Adults (25-64 years)", label: "Adults (25-64 years)"},
			{value: "Seniors 65+", label: "Seniors 65+"},
			
        ],
    },
    {
        name: "orderby",
        label: "Order By",
        type: "select",
        values: [
            {value:"PRICE_L_H",label:"Price - Low to High"},
            {value:"PRICE_H_L",label:"Price - High to Low"},
            {value:"RATING_L_H",label:"Rating - Low to Hight"},
            {value:"RATING_H_L",label:"Rating - High to Low"},
        ],
    }
]
