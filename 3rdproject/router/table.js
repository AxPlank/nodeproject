"use strict";

module.exports = () => {
    const router = require('express').Router();
    const db = require('../config/mysql')();

    db.connect();

    router.get('/:league/add', (req, res) => {
        if (!req.session.user || req.session.user["auth"] !== 'admin') {
            res.redirect(`/table/${req.params.league}`);
        } else {
            const obj = {
                user: req.session.user["name"],
                league: req.params.league,
                form: false,
                error: false
            };

            res.render('table/table_add', obj);
        }
    }).post('/:league/add', (req, res) => {
        if (!req.session.user || req.session.user["auth"] !== 'admin') {
            res.redirect(`/table/${req.params.league}`);
        } else if (Object.values(req.body).includes("")) {
            const obj = {
                user: req.session.user["name"],
                error: "There exist that is not entered.",
                form: req.body
            };

            res.render('table/table_add', obj);
        } else {
            const body = Object.values(req.body)
                .map((el, idx) => {
                    if (idx === 0) {
                        return el;
                    } else {
                        return parseInt(el);
                    }
                });

            if (isValidValue(body)) {
                const obj = {
                    user: req.session.user["name"],
                    error: "There is not valid.",
                    form: req.body
                };
    
                res.render('table/table_add', obj);
            } else {
                const team = body[0];
                const league = req.params.league.replace(/_/g, ' ');
                const values = body.slice(1, body.length);
                const pl = values.slice(0, 3).reduce((previous, current) => previous + current, 0);
                const pts = values[0] * 3 + values[1];
                const gd = values[3] - values[4];
                let sql = `insert into team (team, league, pl, win, draw, lose, gf, ga, gd, pts) values ('${team}', '${league}', ${pl}, ${values[0]}, ${values[1]}, ${values[2]}, ${values[3]}, ${values[4]}, ${gd}, ${pts})`;

                db.query(sql, (err) => {
                    if (err) {
                        console.log(err);
                        const obj = {
                            user: req.session.user["name"],
                            url: `/table/${req.params.league}/add`,
                            error: 500
                        };

                        res.render('errorpage', obj);
                    } else {
                        res.redirect(`/table/${req.params.league}`);
                    }
                });
            }
        }
    });

    router.get(['/', '/:league'], (req, res) => {
        let sql = 'select distinct league from team order by league';

        db.query(sql, (err, rows, fields) => {
            if (err) {
                const obj = {
                    url: `/table`,
                    error: 500
                }

                if (req.session.user) {
                    obj["user"] = req.session.user.name;
                } else {
                    obj["user"] = false;
                }

                res.render('errorpage', obj);
            }
            else {
                const leagues = rows;

                if (req.params.league) {
                    const league = req.params.league.replace(/_/g, ' ');
                    sql = `select rank() over (order by pts desc, gd desc, gf desc) as 'rank', team, league, pl, win, draw, lose, gf, ga, gd, pts from team where league='${league}' order by 'rank'`;

                    db.query(sql, (err, rows, fields) => {
                        if (err) {
                            const obj = {
                                url: `/table`,
                                error: 500
                            }

                            if (req.session.user) {
                                obj["user"] = req.session.user["name"];
                            } else {
                                obj["user"] = false;
                            }

                            res.render('errorpage', obj);
                        } else {
                            const obj ={
                                leagues: leagues,
                                league_name: league,
                                teams: rows
                            };

                            if (req.session.user) {
                                obj["auth"] = req.session.user["auth"];
                                obj["user"] = req.session.user["name"];
                            } else {
                                obj["auth"] = obj["user"] = false;
                            }
                            
                            res.render('table/table_detail', obj);
                        }
                    });
                } else {
                    const obj = {
                        leagues: leagues
                    };

                    if (req.session.user) {
                        obj["user"] = req.session.user.name;
                    } else {
                        obj["user"] = false;
                    }

                    res.render('table/table', obj);
                }
            }
        });
    });

    router.get('/:league/:team/edit', (req, res) => {
        if (!req.session.user || req.session.user["auth"] !== 'admin') {
            res.redirect(`/table/${req.params.league}`);
        } else {
            let sql = `select * from team where team="${req.params.team.replace(/_/g, ' ')}"`;

            db.query(sql, (err, data, fields) => {
                if (err) {
                    console.log(err);
                    const obj = {
                        user: req.session.user["name"],
                        url: `/table/${req.params.league}`,
                        error: 500
                    }

                    res.render('errorpage', obj);
                } else if (data.length === 0) {
                    const obj = {
                        user: req.session.user["name"],
                        url: `/table/${req.params.league}`,
                        error: 404
                    }

                    res.render('errorpage', obj);
                } else {
                    const obj = {
                        user: req.session.user["name"],
                        team: data[0]
                    }

                    res.render('table/table_edit', obj);
                }
            });
        }
    }).post('/:league/:team/edit', (req, res) => {
        if (!req.session.user || req.session.user["auth"] !== 'admin') {
            res.redirect(`/table/${req.params.league}`);
        } else if (Object.values(req.body).includes('')) {
            const obj = {
                user: req.session.user["name"],
                url: `/table/${req.params.league}/${req.params.team}/edit`,
                error: 400
            };

            res.render('errorpage', obj);
        } else {
            const body = Object.values(req.body).map(Number);

            if (isValidValue(body)) {
                const obj = {
                    user: req.session.user["name"],
                    url: `/table/${req.params.league}/${req.params.team}/edit`,
                    error: 400
                };

                res.render('errorpage', obj);
            } else {
                const pl = body.slice(0, 3).reduce((previous, current) => previous + current, 0);
                const pts = body[0] * 3 + body[1];
                const gd = body[3] - body[4];
                let sql = `update team set pl=${pl}, win=${body[0]}, draw=${body[1]}, lose=${body[2]}, gf=${gd}, ga=${body[3]}, gd=${body[4]}, pts=${pts} where team="${req.params.team.replace(/_/g, ' ')}"`;

                db.query(sql, (err, data, fields) => {
                    if (err) {
                        const obj = {
                            user: req.session.user["name"],
                            url: `/table/${req.params.league}/${req.params.team}/edit`,
                            error: 500
                        }

                        res.render('errorpage', obj);
                    } else {
                        res.redirect(`/table/${req.params.league}`);
                    }
                })
            }
        }
    });

    router.get('/:league/:team/delete', (req, res) => {
        if (!req.session.user || req.session.user["auth"] !== 'admin') {
            res.redirect(`/table/${req.params.league}`);
        } else {
            const team = req.params.team.replace(/_/g, ' ');
            let sql = `delete from team where team='${team}'`;

            db.query(sql, (err, data) => {
                if (err) {
                    console.log(err);
                    
                    const obj = {
                        user: req.session.user["name"],
                        url: `/table/${req.params.league}/${req.params.team}/edit`,
                        error: 500
                    };

                    res.render('errorpage', obj);
                } else {
                    res.redirect(`/table/${req.params.league}`);
                }
            });
        }
    });

    function isValidValue(arr) {
        for (let el of arr) {
            if (!el && el !== 0) {
                console.log(true);
                return true;
            }
        }
    
        return false;
    }

    return router;
}