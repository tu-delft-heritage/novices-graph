let data_men;
let data_fem;
let studies;
let options;

Promise.all([
    d3.json("male_at_tu.json"),
    d3.json("female_at_tu.json")
]).then(function(data){
    data_men = data[0];
    data_fem = data[1];

    let fem_perc = [];
    for(var i = 0; i < Object.values(data_men["Totaal"]).length; i++){
        var calc_percent = (Object.values(data_fem["Totaal"])[i]/(Object.values(data_men["Totaal"])[i]+Object.values(data_fem["Totaal"])[i]));
        if (isNaN(calc_percent)){
            fem_perc.push({
                x: new Date(Object.keys(data_fem["Totaal"])[i],0),
                // x: Object.keys(data_fem["Totaal"])[i],
                y: 0
            })
        //   fem_perc.push(0);
        } else {
            fem_perc.push({
                x: new Date(Object.keys(data_fem["Totaal"])[i],0),
                // x: Object.keys(data_fem["Totaal"])[i],
                y: calc_percent
            })
        //   fem_perc.push(calc_percent.toFixed(1));
        }
    };

    studies = [];
    let exceptions = ["alle lessen", "enkele lessen", "ijker", "nan", "Totaal"];
    for(let i=0; i < Object.keys(data_fem).length; i++) {
        if(exceptions.includes(Object.keys(data_fem)[i])){
        } else {
            let d_points = [];
            for(let j=0; j < Object.values(data_fem[Object.keys(data_fem)[i]]).length; j++) {
                d_points.push({
                    x: new Date(Object.keys(data_fem[Object.keys(data_fem)[i]])[j],0),
                    // x: Object.keys(data_fem[Object.keys(data_fem)[i]])[j],
                    y: Object.values(data_fem[Object.keys(data_fem)[i]])[j]
                })
            }
            studies.push({
                type: "stackedColumn",
                axisYType: "primary",
                showInLegend: true,
                name: Object.keys(data_fem)[i], 
                xValueFormatString: "YYYY",
                toolTipContent: "{x} </br> {name}: {y} Female students",
                dataPoints: d_points
          })
        }
    };

    studies.push({
        type: "line",
        axisYType: "secondary",
        showInLegend: true,
        name: "Percentage",
        xValueFormatString: "YYYY",
        yValueFormatString: "##.#%",
        toolTipContent: " {x} </br> {y} at TU Delft",
        dataPoints: fem_perc
    });

    const chart = new CanvasJS.Chart(plot,{
        title :{
            text: "Women at the TU Delft",
            fontSize: 32
        },
        height:1500,
        width:1500,
        axisX:{
            title: "Year",
            interval: 5,
            intervalType: "year",
            labelAutoFit: true,
            titleFontSize: 32,
            labelFontSize: 20,
            stripLines: [
                {   
                    label: "First worldwar",
                    startValue: new Date(1914,0),
                    endValue: new Date(1918,0),
                    labelFontSize: 20,
                    labelBackgroundColor: "#ffffff00", // Transparent background for text
                    labelAlign: "center", // near, center or far
                    lineDashType: "solid",                
                    color:"#d8d8d8",
                    opacity: .8
                },
                {   
                    label: "Second worldwar",
                    startValue: new Date(1938,0),
                    endValue: new Date(1945,0),
                    labelFontSize: 20,
                    labelBackgroundColor: "#ffffff00", // Transparent background for text
                    labelAlign: "center", // near, center or far
                    lineDashType: "solid",                
                    color:"#d8d8d8",
                    opacity: .8
                },
                {
                    label: "oil crisis",
                    value: new Date(1973,0),
                    thickness: 5,
                    labelFontSize: 20,
                    labelBackgroundColor: "#ffffff00", // Transparent background for text
                    labelAlign: "center", // near, center or far
                    lineDashType: "dash",                
                    color:"#d8d8d8",
                    opacity: .8
                }
            ]
        },
        axisY:{
            title: "Amount per program",
            labelAutoFit: true,
            titleFontSize: 28,
            labelFontSize: 20
        },
        axisY2:{
            title: "Total percentage",
            valueFormatString: "##.#%",
            minimum: 0,
            maximum: .35,
            titleFontSize: 28,
            labelFontSize: 20
        },
        legend: {
            fontSize:20
        },
        toolTip:{
            enabled: true,
            animationEnabled: true,
            shared: false, 
            // contentFormatter: function(e) {
            //     let str = e.entries[0].dataPoint.y + "<br/>";
            //     for(let i = 0; i < e.entries.length; i++){
            //         if(e.entries[i]){
            //             let temp = ("<span style='color:" +e.entries[i].dataSeries.color + "'>" + e.entries[i].dataSeries.name+ "</span>: " + e.entries[i].dataPoint.y);
            //             str = str.concat(temp + "<br/>");
            //         }
            //     }
            //     return(str)
            // }
        },
        data: studies
    });



    chart.render();


});