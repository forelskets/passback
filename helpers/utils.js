const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs');

module.exports.verifyJwt = (token) => {
    try {
        const tokenDetail = jwt.verify(token, process.env.JWT_SECRET)
        return tokenDetail
    }
    catch (err) {
        return false;
    }

}

module.exports.generateToken = payload => jwt.sign(payload, process.env.JWT_SECRET);

module.exports.paginationData = (totalCount, LIMIT, OFFSET) => {
    let totalPages = Math.ceil(totalCount / LIMIT);
    let currentPage = Math.floor(OFFSET / LIMIT);
    let prevPage = (currentPage - 1) > 0 ? (currentPage - 1) * LIMIT : 0;
    let nextPage = (currentPage + 1) <= totalPages ? (currentPage + 1) * LIMIT : 0;

    return {
        totalCount,
        nextPage,
        prevPage,
        currentPage: currentPage + 1
    }
}

module.exports.compare = async (password, dataPassword) => {
    let checkPassword = await bcrypt.compare(password, dataPassword);
    return checkPassword
}

module.exports.hash = async (newPassword, salt) => {
    const hash = await bcrypt.hash(newPassword, parseInt(process.env.JWT_SALT))
    return hash

}

module.exports.customCORSHandler = (request, response, next) => {
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, On-behalf-of, x-sg-elas-acl");
    response.header("Access-Control-Allow-Credentials", true);
    response.header("access-control-allow-methods", "*");
    next()
}


module.exports.escapeSpecialCharacter = (text) => {
    if (text) {
        return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }
    else {
        return '';
    }
}

module.exports.randomAlphaNumericCode = () => Math.random().toString(36).slice(2).toUpperCase().slice(0, 8)

module.exports.isNotNullAndUndefined = value => value !== undefined && value !== null;

module.exports.createSuccessResponse = (message, data, success = true) => {
    return { success, message, data };
}

module.exports.createErrorResponse = (message, data, success = false) => {
    return { success, message, data };
}

module.exports.randomAlphaNumericCodeUpto10 = () => Math.random().toString(36).slice(2).toUpperCase().slice(0, 10)

module.exports.transformTripName = (type) => {
    return type == "roundTrip" ? "Round Trip" : type == "oneWay" ? "One Day Ticket" : "Long Ticket"
}