const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const PEXELS_API_KEY = 'Jx59iAvLEok7uzDYzrdJd6rf8bVoJILK9iaA1V73K8NdfzrqvbRjkr5Z';

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const normalizeText = (text) => {
    if (!text) return "";
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const recipesPath = path.join(__dirname, 'data', 'recipes.json');
let recipes = [];

try {
    const rawData = fs.readFileSync(recipesPath, 'utf8').replace(/^\uFEFF/, '');
    recipes = JSON.parse(rawData);
} catch (error) {
    console.error('Error loading recipes:', error);
}

/**
 * Busca una imagen real en Pexels para la receta
 * Recibe el objeto recipe completo
 */
async function getRealImage(recipe) {
    try {
        let searchTerm = recipe.imageKeyword || recipe.name;

        searchTerm = searchTerm.toLowerCase()
            .replace(/casero|casera|estilo|especial|mi abuela|la tía|de la casa/g, '')
            .trim();

        const dictionary = {
            "zapallitos rellenos": "stuffed zucchini",
            "arroz chaufa": "fried rice dish",
            "sopa de verduras": "vegetable soup bowl",
            "pasta con salsa": "pasta tomato sauce",
            "pollo al limon": "lemon chicken",
            "omelette": "omelette cheese",
            "pollo al limón con arroz": "lemon chicken rice",
            "ensalada de atún y garbanzos": "tuna chickpea salad",
            "pasta con salsa de tomate y queso": "pasta tomato sauce cheese",
            "salmón al horno con verduras": "baked salmon vegetables",
            "omelette de queso y espinaca": "spinach cheese omelette",
            "tacos de pollo y aguacate": "chicken avocado tacos",
            "lentejas guisadas": "lentil stew",
            "risotto de champiñones": "mushroom risotto",
            "milanesas con puré": "breaded cutlet mashed potato",
            "wraps vegetarianos": "vegetarian wrap",
            "gnocchi con tuco": "gnocchi tomato sauce",
            "pechugas a la plancha con calabaza": "grilled chicken pumpkin",
            "quesadillas de jamón y queso": "ham cheese quesadilla",
            "hamburguesas caseras de lentejas": "lentil burger",
            "pizza margarita": "margherita pizza",
            "wok de pollo y verduras": "chicken vegetable stir fry",
            "berenjenas rellenas": "stuffed eggplant",
            "pescado al papillote": "fish en papillote",
            "fajitas de res": "beef fajitas",
            "ensalada rusa": "russian potato salad",
            "canelones de verdura": "vegetable cannelloni",
            "brochetas de pollo y vegetales": "chicken vegetable skewers",
            "sopa de verduras casera": "homemade vegetable soup",
            "zapallitos rellenos": "stuffed zucchini baked"
        };

        const englishTerm = dictionary[searchTerm.toLowerCase()] || searchTerm;

        const response = await fetch(
            `https://api.pexels.com/v1/search?query=${encodeURIComponent(englishTerm + ' food plated')}&per_page=5&orientation=landscape`,
            { headers: { Authorization: PEXELS_API_KEY } }
        );

        const data = await response.json();

        if (data.photos && data.photos.length > 0) {
            const randomIndex = Math.floor(Math.random() * Math.min(data.photos.length, 5));
            return data.photos[randomIndex].src.large;
        }

        return 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg';

    } catch (e) {
        console.error("Error buscando imagen:", e);
        return 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg';
    }
}

// Endpoint Aleatorio
app.get('/api/random', async (req, res) => {
    const { category, ingredient, maxTime } = req.query;
    console.log(`🔍 Búsqueda recibida: cat=${category}, ing=${ingredient}, time=${maxTime}`);

    let filteredRecipes = [...recipes];

    if (category) {
        filteredRecipes = filteredRecipes.filter(r => r.categories.includes(normalizeText(category)));
    }

    if (maxTime) {
        filteredRecipes = filteredRecipes.filter(r => parseInt(r.time) <= parseInt(maxTime));
    }

    if (ingredient) {
        const ingNorm = normalizeText(ingredient);
        filteredRecipes = filteredRecipes.filter(r =>
            r.ingredients.some(i => normalizeText(i).includes(ingNorm)) ||
            normalizeText(r.name).includes(ingNorm)
        );
    }

    console.log(`📊 Resultados encontrados: ${filteredRecipes.length}`);

    if (filteredRecipes.length === 0) {
        return res.status(404).json({ error: 'No se encontraron recetas.' });
    }

    const randomIndex = Math.floor(Math.random() * filteredRecipes.length);
    let recipe = { ...filteredRecipes[randomIndex] };

    recipe.image = await getRealImage(recipe);

    res.json(recipe);
});

// Endpoint Receta del Día
app.get('/api/daily', async (req, res) => {
    if (recipes.length === 0) return res.status(500).json({ error: 'No hay recetas' });

    const today = new Date();
    const dateInt = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const dailyIndex = dateInt % recipes.length;

    let recipe = { ...recipes[dailyIndex] };
    recipe.image = await getRealImage(recipe);

    res.json(recipe);
});

// Obtener receta por ID
app.get('/api/recipes/:id', async (req, res) => {
    const recipeFound = recipes.find(r => r.id === req.params.id);
    if (!recipeFound) return res.status(404).json({ error: 'No encontrada' });

    let recipe = { ...recipeFound };
    recipe.image = await getRealImage(recipe);
    res.json(recipe);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor listo para producción en el puerto ${PORT}`);
    console.log(`🌐 Si usas Render/Railway, la URL será la que ellos te proporcionen.`);
});

