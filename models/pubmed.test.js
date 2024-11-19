"use strict"
process.env.NODE_ENV === 'test';

const request = require('supertest');
const app = require('../app.js');
const Pubmed = require('./pubmed.js');
const {pubmedData1, pubmedData2} = require('./pubmedData.js');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const db = require('../db.js');

let mock;

beforeEach(() => {
    mock = new MockAdapter(axios);
});

afterEach(async () => {
    mock.restore();
    await db.end();
})

/**Pubmed.getDateStrings */
describe('Pubmed.getDateStrings', function(){
    test('returns accurate date strings', async function() {
        const mockToday = new Date('2024-12-10');
        jest.useFakeTimers();
        jest.setSystemTime(mockToday);
        const expectedToday = '2024%2F12%2F10';
        const expectedMonthAgo = '2024%2F11%2F10';
        const result = Pubmed.getDateStrings();
        expect(result.today).toEqual(expectedToday);
        expect(result.monthAgo).toEqual(expectedMonthAgo);
        jest.useRealTimers();
    });
});

/**Pubmed.getArticleIds */
describe('Pubmed.getArticleIds', function(){
    test('returns a list of articleIds based on keywords', async function() {
        const keywords = ['chronic fatigue syndrome', 'brain fog', 'long covid'];
        const mockGetDateStrings = {today: `2024%2F10%2F30`, monthAgo: `2024%2F09%2F30`};
        jest.spyOn(Pubmed, 'getDateStrings').mockImplementation(() => mockGetDateStrings);
        mock.onGet('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=chronic%20fatigue%20syndrome+OR+brain%20fog+OR+long%20covid&field=title&mindate=2024%2F09%2F30&maxdate=2024%2F10%2F30&retmode=json&retmax=100&sort=pub_date').reply(200, {
            header: {
                "type": "esearch",
                "version": "0.3"
            },
            esearchresult: {
                "count": "9",
                "retmax": "9",
                "retstart": "0",
                "idlist": [
                    "39418958",
                    "39469291",
                    "39442002",
                    "39425035",
                    "39423465",
                    "39449566",
                    "39405447",
                    "39350480",
                    "39399822",
                    "39372835",
                    "39369845",
                    "39357795",
                    "39434583"
                ],
                "translationset": [],
                "querytranslation": "\"chronic\"[Title] AND \"fatigue\"[Title] AND \"syndrome\"[Title] AND 2024/10/16:2024/10/30[Date - Entry]"
            }
        });
        const results = await Pubmed.getArticleIds(keywords);
        expect(results).toEqual(["39469291","39449566","39442002","39434583","39425035","39423465","39418958","39405447","39399822","39372835","39369845","39357795","39350480"]);
        Pubmed.getDateStrings.mockRestore();
    });
    test('correctly handles a keyword that is not found', async () => {
        const keywords = ['chronic fatigue syndrome', 'lkajsdgoiw', 'long covid'];
        const mockGetDateStrings = {today: `2024%2F10%2F30`, monthAgo: `2024%2F09%2F30`};
        jest.spyOn(Pubmed, 'getDateStrings').mockImplementation(() => mockGetDateStrings);
        mock.onGet('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=chronic%20fatigue%20syndrome+OR+lkajsdgoiw+OR+long%20covid&field=title&mindate=2024%2F09%2F30&maxdate=2024%2F10%2F30&retmode=json&retmax=100&sort=pub_date').reply(200, {
            "header": {
                "type": "esearch",
                "version": "0.3"
            },
            "esearchresult": {
                "count": "9",
                "retmax": "9",
                "retstart": "0",
                "idlist": [
                    "39418958",
                    "39469291",
                    "39442002",
                    "39425035",
                    "39423465",
                    "39399822",
                    "39372835",
                    "39369845",
                    "39357795",
                    "39434583"
                ],
                "translationset": [],
                "querytranslation": "\"chronic\"[Title] AND \"fatigue\"[Title] AND \"syndrome\"[Title] AND 2024/10/16:2024/10/30[Date - Entry]"
            }
        });
        const results = await Pubmed.getArticleIds(keywords);
        expect(results).toEqual(["39469291","39442002","39434583","39425035","39423465","39418958","39399822","39372835","39369845","39357795"]);
        Pubmed.getDateStrings.mockRestore();
    });
    test('returns cached results on duplicate request', async function() {
        const mockGetDateStrings = {today: `2024%2F10%2F30`, monthAgo: `2024%2F09%2F30`};
        jest.spyOn(Pubmed, 'getDateStrings').mockImplementation(() => mockGetDateStrings);
        mock.onGet('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=neuropathy&field=title&mindate=2024%2F09%2F30&maxdate=2024%2F10%2F30&retmode=json&retmax=100&sort=pub_date').reply(200, {
            "header": {
                "type": "esearch",
                "version": "0.3"
            },
            "esearchresult": {
                "count": "147",
                "retmax": "100",
                "retstart": "0",
                "idlist": [
                    "12345",
                    "67890"
                ],
                "translationset": [],
                "querytranslation": "\"long\"[Title] AND \"covid\"[Title] AND 2024/09/30:2024/10/30[Date - Entry]"
            }
        });
        const firstResult = await Pubmed.getArticleIds(['neuropathy']);
        expect(firstResult).toEqual(['67890', '12345']);
        expect(mock.history.get.length).toBe(1);

        const secondResult = await Pubmed.getArticleIds(['neuropathy']);
        expect(secondResult).toEqual(['67890', '12345']);
        expect(mock.history.get.length).toBe(1);
        Pubmed.getDateStrings.mockRestore();
    });
    test('returns an error if Pubmed fails', async function(){
        let result;
        try {
            const mockGetDateStrings = {today: `2024%2F10%2F30`, monthAgo: `2024%2F09%2F30`};
            jest.spyOn(Pubmed, 'getDateStrings').mockImplementation(() => mockGetDateStrings);
            mock.onGet('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=lyme&field=title&mindate=2024%2F09%2F30&maxdate=2024%2F10%2F30&retmode=json&retmax=100&sort=pub_date').reply(429, {
                "error": "API rate limit exceeded",
                "api-key": "23.88.155.191",
                "count": "4",
                "limit": "3"
    
            });
            result = await Pubmed.getArticleIds(['lyme']);
        } catch(error) {
            expect(result).toBe('API rate limit exceeded');
        }
    });
    test('returns an empty array if no articles found', async function(){
        const keywords = ['asdgasdg'];
        const mockGetDateStrings = {today: `2024%2F10%2F30`, monthAgo: `2024%2F09%2F30`};
        jest.spyOn(Pubmed, 'getDateStrings').mockImplementation(() => mockGetDateStrings);
        mock.onGet('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=asdgasdg&field=title&mindate=2024%2F09%2F30&maxdate=2024%2F10%2F30&retmode=json&retmax=100&sort=pub_date').reply(200, {
            "header": {
                "type": "esearch",
                "version": "0.3"
            },
            "esearchresult": {
                "count": "0",
                "retmax": "0",
                "retstart": "0",
                "idlist": [],
                "translationset": [],
                "querytranslation": "asdgasdg AND 2024/10/16:2024/09/30[EDAT]",
                "errorlist": {
                    "phrasesnotfound": [
                        "lkajsdgoiw"
                    ],
                    "fieldsnotfound": []
                },
                "warninglist": {
                    "phrasesignored": [],
                    "quotedphrasesnotfound": [],
                    "outputmessages": [
                        "No items found."
                    ]
                }
            }
        });

        const results = await Pubmed.getArticleIds(keywords);
        expect(results).toEqual([]);
        Pubmed.getDateStrings.mockRestore();
    });
});

/**Pubmed.getArticles */
describe('Pubmed.getArticles', function() {
    test('returns a set of article details based on ids', async function() {
        const articleIds = ["39469291","39449566","39442002","39434583","39425035","39423465","39418958","39405447","39399822","39372835","39369845","39357795","39350480"];
        mock.onGet('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=39469291,39449566,39442002,39434583,39425035,39423465,39418958,39405447,39399822,39372835,39369845,39357795,39350480,&retmode=xml').reply(200, pubmedData2);
        const results = await Pubmed.getArticles(articleIds);
        expect(results).toEqual([
            {
                PMID: '39469291',
                title: 'Trends and Hotspots in the Health Economics Evaluation of Chronic Fatigue Syndrome.',
                abstract: `The hotspot of health economics evaluation methods in this field is cost-effectiveness analysis, and the hotspot of diagnosis and treatment methods is cognitive&#x2012;behavioral therapy. We also found that chronic fatigue syndrome may also have a strong potential association with depression from the perspective of health economics. Health economic evaluations of multiple treatments should be conducted simultaneously to increase attention to this field and provide a reference basis for low-cost and high-quality diagnostic and treatment programs.`
            },
            {
                PMID: '39449566',
                title: `Much more than a biological phenomenon: A qualitative study of women\"s experiences of brain fog across their reproductive journey.`,
                abstract: ''
            },
            {
                PMID: '39442002',
                title: `Genetic variants associated with chronic fatigue syndrome predict population-level fatigue severity and actigraphic measurements.`,
                abstract: `The genetic overlap of CFS risk with actigraphy and subjective fatigue phenotypes suggests that some biological mechanisms underlying pathologic fatigue in CFS patients also underlie fatigue symptoms at a broader population level. Therefore, understanding the biology of fatigue in general may inform our understanding of CFS pathophysiology.`
            },
            {
                PMID: `39434583`,
                title: `Planning for Long-Term Recovery: The Impact of COVID-19 on Educators Working With Children From Seasonal and Migrant Farmworker Families.`,
                abstract: `Educators working with migrant children need additional supports-including support from administrators, psychological services, and opportunities to give/receive colleague/peer support.`
            },
            {
                PMID: `39425035`,
                title: `Chronic Overlapping Pain Conditions in people with Myalgic Encephalomyelitis/Chronic Fatigue Syndrome (ME/CFS): a sample from the Multi-site Clinical Assessment of ME/CFS (MCAM) study.`,
                abstract: `More than 75% of ME/CFS participants had one or more COPCs. Multiple COPCs further exacerbated illness severity, especially among females with ME/CFS. Assessment and management of COPCs may help improve the health and quality of life for patients with ME/CFS.`
            },
            {
                PMID: `39423465`,
                title: `Predictors of treatment response trajectories to cognitive behavioral therapy for chronic fatigue syndrome: A cohort study.`,
                abstract: `On a group level, there were statistically significant reductions in fatigue after 15 sessions of CBT, with important individual differences in treatment response. Higher pre-treatment levels of anxious, depressive, and somatic symptoms and perceived stress are predictors of lack of response, with reductions in anxiety and stress preceding improvements in fatigue.`
            },
            {
                PMID: `39418958`,
                title: `Risk of chronic fatigue syndrome after COVID-19: A retrospective cohort study of 3227281 patients.`,
                abstract: `COVID-19 patients have a higher risk of developing CFS compared to individuals without COVID-19. The increased risk is particularly significant in adults aged 18 years and older.`
            },
            {
                PMID: `39405447`,
                title: `Sweet relief: make the brain Glo against diabetic cognitive fog.`,
                abstract: ''
            },
            {
                PMID: `39399822`,
                title: `Long-term follow-up of the treatment for severe COVID-19 with qigong exercise and acupressure: A randomized controlled trial.`,
                abstract: `QARP had long-term sustained efficacy for dyspnea, chest tightness, and cough in patients with COVID-19, especially in young and middle-aged patients, and the effect was significant at the 14th month of follow-up.`
            },
            {
                PMID: `39372835`,
                title: `Comparing personality traits of healthcare workers with and without long COVID: Cross-sectional study.`,
                abstract: `Risk factors for long COVID may include the number of symptoms at the time of illness and neurotic tendency on NEO Five Factor Inventory. Participants with long COVID had poorer mental health according to HRQOL. People with long COVID might be especially sensitive to and pessimistic about the symptoms that interfere with their daily lives, resulting in certain cognitive and behavioral patterns. They may benefit from early psychiatric intervention.`
            },
            {
                PMID: `39369845`,
                title: `Exploring the characteristics and antecedents of clinically significant long COVID: A longitudinal cohort study.`,
                abstract: ``
            },
            {
                PMID: `39357795`,
                title: `Gastrointestinal manifestations of long COVID.`,
                abstract: ``
            },
            {
                PMID: `39350480`,
                title: `The neuropsychological impacts of COVID-19 in non-hospitalized patients with long COVID and brain fog.`,
                abstract: `Nearly 70% of patients with subjective cognitive complaints and long COVID had objective cognitive impairments. A comprehensive evaluation is essential for patients with long COVID and brain fog, including those with mild symptoms.`
            }
        ]);
    });
    test('returns cached results on duplicate request', async function(){
        const articleIds = ["39469291","39449566","39442002","39434583","39425035","39423465","39418958","39405447","39399822","39372835","39369845","39357795"];
        mock.onGet('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=39469291,39449566,39442002,39434583,39425035,39423465,39418958,39405447,39399822,39372835,39369845,39357795,&retmode=xml').reply(200, pubmedData1);
        const firstResult = await Pubmed.getArticles(articleIds);
        expect(firstResult).toEqual([
            {
                PMID: '39469291',
                title: 'Trends and Hotspots in the Health Economics Evaluation of Chronic Fatigue Syndrome.',
                abstract: `The hotspot of health economics evaluation methods in this field is cost-effectiveness analysis, and the hotspot of diagnosis and treatment methods is cognitive&#x2012;behavioral therapy. We also found that chronic fatigue syndrome may also have a strong potential association with depression from the perspective of health economics. Health economic evaluations of multiple treatments should be conducted simultaneously to increase attention to this field and provide a reference basis for low-cost and high-quality diagnostic and treatment programs.`
            },
            {
                PMID: '39449566',
                title: `Much more than a biological phenomenon: A qualitative study of women\"s experiences of brain fog across their reproductive journey.`,
                abstract: ''
            },
            {
                PMID: '39442002',
                title: `Genetic variants associated with chronic fatigue syndrome predict population-level fatigue severity and actigraphic measurements.`,
                abstract: `The genetic overlap of CFS risk with actigraphy and subjective fatigue phenotypes suggests that some biological mechanisms underlying pathologic fatigue in CFS patients also underlie fatigue symptoms at a broader population level. Therefore, understanding the biology of fatigue in general may inform our understanding of CFS pathophysiology.`
            },
            {
                PMID: `39434583`,
                title: `Planning for Long-Term Recovery: The Impact of COVID-19 on Educators Working With Children From Seasonal and Migrant Farmworker Families.`,
                abstract: `Educators working with migrant children need additional supports-including support from administrators, psychological services, and opportunities to give/receive colleague/peer support.`
            },
            {
                PMID: `39425035`,
                title: `Chronic Overlapping Pain Conditions in people with Myalgic Encephalomyelitis/Chronic Fatigue Syndrome (ME/CFS): a sample from the Multi-site Clinical Assessment of ME/CFS (MCAM) study.`,
                abstract: `More than 75% of ME/CFS participants had one or more COPCs. Multiple COPCs further exacerbated illness severity, especially among females with ME/CFS. Assessment and management of COPCs may help improve the health and quality of life for patients with ME/CFS.`
            },
            {
                PMID: `39423465`,
                title: `Predictors of treatment response trajectories to cognitive behavioral therapy for chronic fatigue syndrome: A cohort study.`,
                abstract: `On a group level, there were statistically significant reductions in fatigue after 15 sessions of CBT, with important individual differences in treatment response. Higher pre-treatment levels of anxious, depressive, and somatic symptoms and perceived stress are predictors of lack of response, with reductions in anxiety and stress preceding improvements in fatigue.`
            },
            {
                PMID: `39418958`,
                title: `Risk of chronic fatigue syndrome after COVID-19: A retrospective cohort study of 3227281 patients.`,
                abstract: `COVID-19 patients have a higher risk of developing CFS compared to individuals without COVID-19. The increased risk is particularly significant in adults aged 18 years and older.`
            },
            {
                PMID: `39405447`,
                title: `Sweet relief: make the brain Glo against diabetic cognitive fog.`,
                abstract: ''
            },
            {
                PMID: `39399822`,
                title: `Long-term follow-up of the treatment for severe COVID-19 with qigong exercise and acupressure: A randomized controlled trial.`,
                abstract: `QARP had long-term sustained efficacy for dyspnea, chest tightness, and cough in patients with COVID-19, especially in young and middle-aged patients, and the effect was significant at the 14th month of follow-up.`
            },
            {
                PMID: `39372835`,
                title: `Comparing personality traits of healthcare workers with and without long COVID: Cross-sectional study.`,
                abstract: `Risk factors for long COVID may include the number of symptoms at the time of illness and neurotic tendency on NEO Five Factor Inventory. Participants with long COVID had poorer mental health according to HRQOL. People with long COVID might be especially sensitive to and pessimistic about the symptoms that interfere with their daily lives, resulting in certain cognitive and behavioral patterns. They may benefit from early psychiatric intervention.`
            },
            {
                PMID: `39369845`,
                title: `Exploring the characteristics and antecedents of clinically significant long COVID: A longitudinal cohort study.`,
                abstract: ``
            },
            {
                PMID: `39357795`,
                title: `Gastrointestinal manifestations of long COVID.`,
                abstract: ``
            }
        ]);
        expect(mock.history.get.length).toBe(1);

        const secondResult = await Pubmed.getArticles(articleIds);
        expect(secondResult).toEqual([
            {
                PMID: '39469291',
                title: 'Trends and Hotspots in the Health Economics Evaluation of Chronic Fatigue Syndrome.',
                abstract: `The hotspot of health economics evaluation methods in this field is cost-effectiveness analysis, and the hotspot of diagnosis and treatment methods is cognitive&#x2012;behavioral therapy. We also found that chronic fatigue syndrome may also have a strong potential association with depression from the perspective of health economics. Health economic evaluations of multiple treatments should be conducted simultaneously to increase attention to this field and provide a reference basis for low-cost and high-quality diagnostic and treatment programs.`
            },
            {
                PMID: '39449566',
                title: `Much more than a biological phenomenon: A qualitative study of women\"s experiences of brain fog across their reproductive journey.`,
                abstract: ''
            },
            {
                PMID: '39442002',
                title: `Genetic variants associated with chronic fatigue syndrome predict population-level fatigue severity and actigraphic measurements.`,
                abstract: `The genetic overlap of CFS risk with actigraphy and subjective fatigue phenotypes suggests that some biological mechanisms underlying pathologic fatigue in CFS patients also underlie fatigue symptoms at a broader population level. Therefore, understanding the biology of fatigue in general may inform our understanding of CFS pathophysiology.`
            },
            {
                PMID: `39434583`,
                title: `Planning for Long-Term Recovery: The Impact of COVID-19 on Educators Working With Children From Seasonal and Migrant Farmworker Families.`,
                abstract: `Educators working with migrant children need additional supports-including support from administrators, psychological services, and opportunities to give/receive colleague/peer support.`
            },
            {
                PMID: `39425035`,
                title: `Chronic Overlapping Pain Conditions in people with Myalgic Encephalomyelitis/Chronic Fatigue Syndrome (ME/CFS): a sample from the Multi-site Clinical Assessment of ME/CFS (MCAM) study.`,
                abstract: `More than 75% of ME/CFS participants had one or more COPCs. Multiple COPCs further exacerbated illness severity, especially among females with ME/CFS. Assessment and management of COPCs may help improve the health and quality of life for patients with ME/CFS.`
            },
            {
                PMID: `39423465`,
                title: `Predictors of treatment response trajectories to cognitive behavioral therapy for chronic fatigue syndrome: A cohort study.`,
                abstract: `On a group level, there were statistically significant reductions in fatigue after 15 sessions of CBT, with important individual differences in treatment response. Higher pre-treatment levels of anxious, depressive, and somatic symptoms and perceived stress are predictors of lack of response, with reductions in anxiety and stress preceding improvements in fatigue.`
            },
            {
                PMID: `39418958`,
                title: `Risk of chronic fatigue syndrome after COVID-19: A retrospective cohort study of 3227281 patients.`,
                abstract: `COVID-19 patients have a higher risk of developing CFS compared to individuals without COVID-19. The increased risk is particularly significant in adults aged 18 years and older.`
            },
            {
                PMID: `39405447`,
                title: `Sweet relief: make the brain Glo against diabetic cognitive fog.`,
                abstract: ''
            },
            {
                PMID: `39399822`,
                title: `Long-term follow-up of the treatment for severe COVID-19 with qigong exercise and acupressure: A randomized controlled trial.`,
                abstract: `QARP had long-term sustained efficacy for dyspnea, chest tightness, and cough in patients with COVID-19, especially in young and middle-aged patients, and the effect was significant at the 14th month of follow-up.`
            },
            {
                PMID: `39372835`,
                title: `Comparing personality traits of healthcare workers with and without long COVID: Cross-sectional study.`,
                abstract: `Risk factors for long COVID may include the number of symptoms at the time of illness and neurotic tendency on NEO Five Factor Inventory. Participants with long COVID had poorer mental health according to HRQOL. People with long COVID might be especially sensitive to and pessimistic about the symptoms that interfere with their daily lives, resulting in certain cognitive and behavioral patterns. They may benefit from early psychiatric intervention.`
            },
            {
                PMID: `39369845`,
                title: `Exploring the characteristics and antecedents of clinically significant long COVID: A longitudinal cohort study.`,
                abstract: ``
            },
            {
                PMID: `39357795`,
                title: `Gastrointestinal manifestations of long COVID.`,
                abstract: ``
            }
        ]);
        expect(mock.history.get.length).toBe(1);
    });
    test('returns an error if Pubmed fails', async function(){
        let result;
        try {
            const articleIds = ["39469291","39449566","39442002"];
            mock.onGet('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=39469291,39449566,39442002,&retmode=xml').reply(429, {
                "error": "API rate limit exceeded",
                "api-key": "23.88.155.191",
                "count": "4",
                "limit": "3"
            });
            result = await Pubmed.getArticles(articleIds);
        } catch(error) {
            expect(result).toBe('API rate limit exceeded');
        }
    });
});