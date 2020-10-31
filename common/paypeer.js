
let requestPr = require("request-promise");
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
module.exports = {
    getUrlPayeer
}