
let requestPr = require("request-promise");
let {createHash } = require("crypto");
let config = require("./../config");
let getUrlPayeer = async(orderId, amount,des)=>{
    let options ={
        url:"https://payeer.com/ajax/api/api.php?invoiceCreate",
        method:"POST",
        headers:{
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        form:{
            account:config.payeer.account,
            apiId:config.payeer.apiId,
            apiPass:config.payeer.apiPass,
            m_shop:config.payeer.shopId,
            action:"invoiceCreate",
            m_orderid:orderId,
            m_amount:amount,
            m_curr:"USD",
            m_desc:des
        }
    }
    let result = await requestPr(options);
    return result ;
}
const parsePaymentCallback=(body)=>{
    const callbackHash = [
        body['m_operation_id'],
        body['m_operation_ps'],
        body['m_operation_date'],
        body['m_operation_pay_date'],
        body['m_shop'],
        body['m_orderid'],
        body['m_amount'],
        body['m_curr'],
        body['m_desc'],
        body['m_status'],
        config.payeer.shopSecret
      ];
      let dataKey = createHash('sha256').update(callbackHash.join(":")).digest('hex').toUpperCase();
      if(dataKey==body['m_sign']){
          return true ;
      }
      return false ;
}
module.exports = {
    getUrlPayeer,
    parsePaymentCallback
}