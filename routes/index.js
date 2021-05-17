const express = require('express');
const companyController = require('../controllers/companyController');
const gameController = require('../controllers/gameController');
const genreController = require('../controllers/genreController');

const router = express.Router();

// company routes
router.get('/companies', companyController.company_list);
router.get('/company/create', companyController.company_create_get);
router.post('/company/create', companyController.company_create_post);
router.get('/company/:id/update', companyController.company_update_get);
router.post('/company/:id/update', companyController.company_update_post);
router.get('/company/:id/delete', companyController.company_delete_get);
router.post('/company/:id/delete', companyController.company_delete_post);
router.get('/company/:id', companyController.company_detail);

// game routes
router.get('/', gameController.index);
router.get('/games', gameController.game_list);
router.get('/game/create', gameController.game_create_get);
router.post('/game/create', gameController.game_create_post);
router.get('/game/:id/update', gameController.game_update_get);
router.post('/game/:id/update', gameController.game_update_post);
router.get('/game/:id/delete', gameController.game_delete_get);
router.post('/game/:id/delete', gameController.game_delete_post);
router.get('/game/:id', gameController.game_detail);

// genre routes
router.get('/genres', genreController.genre_list);
router.get('/genre/create', genreController.genre_create_get);
router.post('/genre/create', genreController.genre_create_post);
router.get('/genre/:id/update', genreController.genre_update_get);
router.post('/genre/:id/update', genreController.genre_update_post);
router.get('/genre/:id/delete', genreController.genre_delete_get);
router.post('/genre/:id/delete', genreController.genre_delete_post);
router.get('/genre/:id', genreController.genre_detail);

module.exports = router;
