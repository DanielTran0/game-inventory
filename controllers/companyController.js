const { body, validationResult } = require('express-validator');
const async = require('async');
const { format } = require('date-fns');
const db = require('../db');

const companyCoreDatabaseCalls = (id) => {
	return {
		company: async () => {
			return db.oneOrNone('SELECT * FROM company WHERE id = $1', [id]);
		},
		gamecompanies: async () => {
			return db.any('SELECT * FROM gamecompany WHERE companyid = $1', [id]);
		},
		games: async () => {
			return db.any('SELECT * FROM game');
		},
	};
};

const findGamesFromIds = (gameCompanies, games) => {
	const gameIds = gameCompanies.map((gameCompany) => gameCompany.gameid);
	return games.filter((game) => gameIds.includes(game.id));
};

// Display list of all companies
exports.company_list = async (req, res, next) => {
	try {
		const companies = await db.any('SELECT * FROM company');
		res.render('./company/company_list', {
			title: 'All Companies',
			companies,
		});
	} catch (err) {
		next(err);
	}
};

// Display details about a specific company
exports.company_detail = (req, res, next) => {
	async.parallel(companyCoreDatabaseCalls(req.params.id), (err, results) => {
		if (err) return next(err);
		if (results.company === null) {
			const error = new Error('Company not found');
			return next(error);
		}

		const games = findGamesFromIds(results.gamecompanies, results.games);
		const formattedDate = format(results.company.founded, 'MMM dd, yyyy');

		return res.render('./company/company_detail', {
			title: results.company.name,
			company: results.company,
			formattedDate,
			games,
		});
	});
};

// Display company create form on GET
exports.company_create_get = (req, res) => {
	res.render('./company/company_form', { title: 'Add Company' });
};

// Handle company create on POST
exports.company_create_post = [
	body('name')
		.trim()
		.isLength({ min: 3 })
		.withMessage('Minimum company name length is 3')
		.escape(),
	body('location')
		.optional({ checkFalsy: true })
		.trim()
		.isLength({ min: 3 })
		.withMessage('Minimum location name length is 3')
		.escape(),
	body('founded', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),
	async (req, res, next) => {
		const errors = validationResult(req);
		const { name, location } = req.body;
		let { founded } = req.body;
		let imageName = '';

		if (founded === '') founded = '0001-01-01';
		if (req.file) imageName = req.file.filename;
		if (!errors.isEmpty())
			return res.render('./company/company_form', {
				title: 'Add Company',
				company: req.body,
				errors: errors.array(),
			});

		try {
			const companyExists = await db.oneOrNone(
				'SELECT id FROM company WHERE name = $1',
				[req.body.name]
			);

			if (companyExists) return res.redirect(`/company/${companyExists.id}`);

			const newCompany = await db.one(
				'INSERT INTO company (name, location, founded, image) VALUES($1, $2, $3, $4) RETURNING id',
				[name, location, founded, imageName]
			);

			return res.redirect(`/company/${newCompany.id}`);
		} catch (error) {
			return next(error);
		}
	},
];

// Display company update form on GET
exports.company_update_get = async (req, res, next) => {
	try {
		const company = await db.oneOrNone('SELECT * FROM company WHERE id = $1', [
			req.params.id,
		]);

		if (company === null) {
			const error = new Error('Company not found');
			return next(error);
		}

		return res.render('./company/company_form', {
			title: 'Update Company',
			company,
			formattedDate: format(company.founded, 'yyyy-MM-dd'),
		});
	} catch (error) {
		return next(error);
	}
};

// Handle company update on POST
exports.company_update_post = [
	body('name')
		.trim()
		.isLength({ min: 3 })
		.withMessage('Minimum company name length is 3')
		.escape(),
	body('location')
		.optional({ checkFalsy: true })
		.trim()
		.isLength({ min: 3 })
		.withMessage('Minimum location name length is 3')
		.escape(),
	body('founded', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),
	async (req, res, next) => {
		const errors = validationResult(req);
		const { name, location } = req.body;
		let { founded } = req.body;
		let imageName = '';

		if (founded === '') founded = '0001-01-01';
		if (req.file) imageName = req.file.filename;
		if (!errors.isEmpty()) {
			const company = { name, location, founded };

			return res.render('./company/company_form', {
				title: 'Update Company',
				company,
				errors: errors.array(),
			});
		}

		try {
			const companyExists = await db.oneOrNone(
				'SELECT * FROM company WHERE name = $1',
				[name]
			);

			if (companyExists && companyExists.id !== Number(req.params.id))
				return res.redirect(`/company/${companyExists.id}`);

			await db.none(
				'UPDATE company SET (name, location, founded, image) = ($1, $2, $3, $4) WHERE id = $5',
				[name, location, founded, imageName, req.params.id]
			);
			return res.redirect(`/company/${req.params.id}`);
		} catch (error) {
			return next(error);
		}
	},
];

// Display company delete form on GET
exports.company_delete_get = (req, res, next) => {
	async.parallel(companyCoreDatabaseCalls(req.params.id), (err, results) => {
		if (err) return next(err);
		if (results.company === null) return res.redirect('/companies');

		const games = findGamesFromIds(results.gamecompanies, results.games);

		return res.render('./company/company_delete', {
			title: 'Delete Company',
			company: results.company,
			games,
		});
	});
};

// Handle company delete on POST
exports.company_delete_post = (req, res, next) => {
	async.parallel(
		companyCoreDatabaseCalls(req.body.id),
		async (err, results) => {
			if (err) return next(err);

			const games = findGamesFromIds(results.gamecompanies, results.games);

			if (games.length > 0)
				return res.render('./company/company_delete', {
					title: 'Delete Company',
					company: results.company,
					games,
				});

			try {
				await db.none('DELETE FROM company WHERE id = $1', [req.body.id]);
				return res.redirect('/companies');
			} catch (error) {
				return next(error);
			}
		}
	);
};
