import mongoose from "mongoose"

const quoteSchema = mongoose.Schema(
    {
        Type: {
            type: String,
            required: true,
        },
        quote: {
            type: Boolean,
            required: true,
            default: true
        }
    },
    {
        timestamps: true,
    }
)






const Quote = mongoose.model("Quote", quoteSchema)

export default Quote
