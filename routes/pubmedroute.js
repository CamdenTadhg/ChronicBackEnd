"use strict"

/**PUBMED API ROUTES */

const jsonschema = require('jsonschema');
const express = require('express');
const {BadRequestError} = require('../expressError');
const Pubmed = require('../models/pubmed');
const getArticleIdsSchema = require('../schemas/getArticleIds.json');
const getArticlesSchema = require('../schemas/getArticles.json');

const router = express.Router();

/**GET /latest/articleIds  [keyword, ...] => {articleIds: [articleId, ...]}
 * 
 * Returns an object containing an array of article Ids
 * 
 * Authorization required: none
*/

router.get('/articleIds', async function(req, res, next){
    try{
        const keywords = Array.isArray(req.query.keywords) ? req.query.keywords : [req.query.keywords];
        if (keywords.length === 1 && keywords[0] === undefined) {
            throw new BadRequestError('keywords are required.');
        }
        console.log(keywords)
        const validator = jsonschema.validate(keywords, getArticleIdsSchema);
        if (!validator.valid){
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }
        const articleIds = await Pubmed.getArticleIds(keywords);
        return res.json({articleIds});
    } catch(err) {
        return next(err);
    }
});

/**GET /latest/articles  [articleId, ...] => {articles: [{PMID, title, abstract}, ...]} 
 * 
 * Returns an object containing an array of objects containing article details
 * 
 * Authorization required: non
*/

router.get('/articles', async function(req, res, next){
    try {
        const articleIds = Array.isArray(req.query.articleIds) ? req.query.articleIds : [req.query.articleIds];
        if (articleIds.length === 1 && articleIds[0] === undefined){
            throw new BadRequestError('articleIds are required');
        }
        const validator = jsonschema.validate(articleIds, getArticlesSchema);
        if (!validator.valid){
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }
        const articles = await Pubmed.getArticles(articleIds);
        return res.json({articles});
    } catch(err) {
        return next(err)
    }
})

module.exports = router;