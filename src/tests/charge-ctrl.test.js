import should from 'should';
import request from 'supertest';
import nock from 'nock';

import { app } from '../app';
import Models from '../models';

const { NetCard, Order } = Models;

const { describe, it, before, after } = global;

describe('Charge Ctrl Test', () => {
  before(() => {
    nock('http://202.118.166.244:8080')
      .get('/selfservice/module/chargecardself/web/chargecardself_charge.jsf')
      .once()
      .query(true)
      .reply(200, '<input name="hi"></input>');

    nock('http://202.118.166.244:8080')
      .post('/selfservice/module/chargecardself/web/chargecardself_charge.jsf')
      .once()
      .query(true)
      .reply(200, '生成时间');

    nock('http://202.118.166.244:8080')
      .get('/selfservice/module/chargecardself/web/chargecardself_charge.jsf')
      .once()
      .query(true)
      .reply(200, '<input name="hi"></input>');

    nock('http://202.118.166.244:8080')
      .post('/selfservice/module/chargecardself/web/chargecardself_charge.jsf')
      .once()
      .query(true)
      .reply(200, '充值卡已被充值');

    nock('http://202.118.166.244:8080')
      .get('/selfservice/module/chargecardself/web/chargecardself_charge.jsf')
      .once()
      .query(true)
      .reply(200, '<input name="hi"></input>');

    nock('http://202.118.166.244:8080')
      .post('/selfservice/module/chargecardself/web/chargecardself_charge.jsf')
      .once()
      .query(true)
      .reply(200, '充值卡已被充值');
  });

  it('Missing param should return errcode 1', done => {
    request(app)
      .post('/charge')
      .send({})
      .end((err, res) => {
        should(err).be.equal(null);
        should(res.body.errcode).be.equal(1);
        done();
      });
  });

  it('Not found orderID should return errcode 3', done => {
    const form = {
      oid: '56c402494d1103c3473c9731',
      yzoid: 'string',
      openid: 'string',
      stuid: 'string',
      pswd: 'string',
    };
    request(app)
      .post('/charge')
      .send(form)
      .end((err, res) => {
        should(err).be.equal(null);
        should(res.body.errcode).be.equal(3);
        done();
      });
  });

  describe('Fake Real Charge 1', () => {
    const yzoid = 'test1234';
    const openid = 'oMGv_jr1BwEfyJ-ma7Y9jDHwpz8k';
    let oid;
    before((done) => {
      const newOrder = {
        value: 50,
        createAt: new Date(),
        orderID: yzoid,
        openID: openid,
        weixinID: '123',
        count: 3,
      };

      Order.create(newOrder, (err, order) => {
        if (err) return console.error(err);
        oid = order._id;
        done();
      });
    });

    after((done) => {
      Order.remove({ orderID: yzoid }, done);
    });

    it('charge should success', (done) => {
      const form = {
        oid,
        yzoid,
        openid,
        stuid: 'test2',
        pswd: '654123',
      };

      request(app)
        .post('/charge')
        .send(form)
        .end((err, res) => {
          console.log(res.body);
          should(err).be.equal(null);
          should(res.body.errcode).be.equal(0);
          should(res.body.hasFailed).be.equal(false);
          done();
        });
    });
  });

  // describe('Fake Real Charge 2', () => {
  //   const yzoid = 'test2345678';
  //   const openid = 'oMGv_jr1BwEfyJ-ma7Y9jDHwpz8k';
  //   let oid;
  //   before((done) => {
  //     const newOrder = {
  //       value: 50,
  //       createAt: new Date(),
  //       orderID: yzoid,
  //       openID: openid,
  //       weixinID: '123',
  //       count: 1,
  //     };
  //
  //     Order.create(newOrder, (err, order) => {
  //       if (err) return console.error(err);
  //       oid = order._id;
  //       done();
  //     });
  //   });
  //
  //   after((done) => {
  //     Order.remove({ orderID: yzoid }, done);
  //   });
  //
  //   it('charge should failed because err charge code', (done) => {
  //     const form = {
  //       oid,
  //       yzoid,
  //       openid,
  //       stuid: 'test2',
  //       pswd: '654123',
  //     };
  //
  //     request(app)
  //       .post('/charge')
  //       .send(form)
  //       .end((err, res) => {
  //         should(err).be.equal(null);
  //         should(res.body.errcode).be.equal(0);
  //         should(res.body.hasFailed).be.equal(true);
  //         done();
  //       });
  //   });
  // });
});
