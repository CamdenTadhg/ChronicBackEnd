"use strict"

const axios = require('axios');
const {convertXML} = require('simple-xml-to-json');
const {debounce} = require('lodash');

/**Model for interacting with the Pubmed API for the current awareness feature of the site */

//Cache to prevent duplicate api requests
const cache = {};
const CACHE_EXPIRATION = 5 * 60 * 1000 //cache expires after 5 minutes

class Pubmed {

    /**Creates the necessary date strings for searching the API */
    static getDateStrings(){
        let date = new Date();
        let day = date.getUTCDate();
        let month = date.getUTCMonth() + 1;
        let year = date.getUTCFullYear();
        let today = `${year}%2F${month}%2F${day}`;
        let monthAgoDate = new Date(Date.UTC(year, date.getUTCMonth(), date.getUTCDate()));
        monthAgoDate.setUTCDate(monthAgoDate.getUTCDate() - 30);
        day = monthAgoDate.getUTCDate();
        month = monthAgoDate.getUTCMonth() + 1;
        year = monthAgoDate.getUTCFullYear();
        let monthAgo = `${year}%2F${month}%2F${day}`;
        return {today, monthAgo}
    }
    
    /**Get a list of article ids for the last month based on the given keywords
     * Accepts array of keywords to search for
     * Returns array of article IDs
     */
    static async getArticleIds(keywords) {
        try {
            const {today, monthAgo} = Pubmed.getDateStrings();
            const cacheKey = keywords.join(' ');

            if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_EXPIRATION){
                return cache[cacheKey].data
            }
            let articleIdSet = new Set();
            let keywordText = '';
            for (let i=0; i < keywords.length; i++) {
                while (keywords[i].indexOf(' ') > -1){
                    let index = keywords[i].indexOf(' ');
                    let newKeyword = keywords[i].slice(0, index) + '%20' + keywords[i].slice(index + 1);
                    keywords[i] = newKeyword
                }
                if (i === 0) {
                    keywordText = keywords[i]
                } else {
                    keywordText = keywordText + '+OR+' + keywords[i];
                }
            }
            let url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${keywordText}&field=title&mindate=${monthAgo}&maxdate=${today}&retmode=json&retmax=100&sort=pub_date`;
            let response = await axios.get(url);
            if (response.data.esearchresult.idlist) {
                for (let id of response.data.esearchresult.idlist){
                    articleIdSet.add(id);
                }
            }
            const articleIds = [];
            articleIdSet.forEach(v => articleIds.push(v));
            articleIds.sort().reverse()
            cache[cacheKey] = {
                data: articleIds,
                timestamp: Date.now()
            };

            return articleIds;
        } catch(error) {
            return error.error;
        }
    }


    /**Gets articles based on the article id list 
     * accepts array of article IDs
     * returns json object containing PubmedArticleSet with article details (id, title, and abstract)
    */
    static async getArticles(articleIds){
        try {
            const cacheKey = articleIds.join(' ');

            if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_EXPIRATION){
                return cache[cacheKey].data
            }

            let articleString = '';
            for (let article of articleIds){
                articleString = articleString + `${article},`;
            }
            const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${articleString}&retmode=xml`;
            let initialResponse = await axios.get(url)
            let response = initialResponse.data
            let beginIndex = response.indexOf('<!DOCTYPE');
            let endIndex = response.indexOf('dtd">');
            let convertedResponse = response.slice(0, beginIndex) + response.slice(endIndex + 6);
            const fullResponse = convertXML(convertedResponse);
            let articleDetails = [];
            for (let item of fullResponse.PubmedArticleSet.children){
                let medlineCitation = item.PubmedArticle.children.find(child => child.hasOwnProperty('MedlineCitation'));
                let PMID = medlineCitation.MedlineCitation.children.find(child => child.hasOwnProperty('PMID'))
                let article = medlineCitation.MedlineCitation.children.find(child => child.hasOwnProperty('Article'));
                let title = article.Article.children.find(child => child.hasOwnProperty('ArticleTitle'));
                let abstract = article.Article.children.find(child => child.hasOwnProperty('Abstract'));
                let abstractConclusion;
                if (abstract) {
                    abstractConclusion = abstract.Abstract.children.filter(child => child.AbstractText && (child.AbstractText.Label === 'CONCLUSIONS' || child.AbstractText.Label === 'CONCLUSION'));
                }
                if (abstractConclusion) {
                    let abstractText = abstractConclusion.find(child => child.hasOwnProperty('AbstractText')) || {AbstractText: {content: ''}};
                    articleDetails.push({PMID: PMID.PMID.content, title: title.ArticleTitle.content, abstract: abstractText.AbstractText.content});
                } else {
                    articleDetails.push({PMID: PMID.PMID.content, title: title.ArticleTitle.content, abstract: ''});
                }
            }

            cache[cacheKey] = {
                data: articleDetails,
                timestamp: Date.now()
            };

            return articleDetails;
        } catch(error){
            return error.error;
        }
   }
}

module.exports = Pubmed;
